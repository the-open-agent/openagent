// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";
import {Button, Col, Input, Row} from "antd";
import {AudioOutlined, LoadingOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";
import i18next from "i18next";
import * as SttBackend from "../backend/SttBackend";
import {bufferToWav} from "../SpeechProvider/AudioUtils";
import {checkProvider} from "./ProviderWidget";

const {TextArea} = Input;

class TestSttWidget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isRecording: false,
      isTranscribing: false,
      transcript: "",
    };
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.audioChunks = [];
  }

  componentWillUnmount() {
    this.cleanupRecording();
  }

  cleanupRecording() {
    if (this.mediaRecorder && this.state.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (_e) {
        // ignore
      }
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }

  async startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      Setting.showMessage("error", i18next.t("provider:Failed to access microphone"));
      return;
    }
    this.audioChunks = [];

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
    } catch (error) {
      Setting.showMessage("error", `${i18next.t("provider:Failed to access microphone")}: ${error.message}`);
      return;
    }

    let options;
    const mimeTypes = [
      "audio/wav",
      "audio/webm;codecs=pcm",
      "audio/webm;codecs=opus",
      "audio/webm",
    ];
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        options = {mimeType: type};
        break;
      }
    }
    try {
      this.mediaRecorder = options ? new MediaRecorder(this.mediaStream, options) : new MediaRecorder(this.mediaStream);
    } catch (_e) {
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
    }

    this.mediaRecorder.addEventListener("dataavailable", event => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    });

    this.mediaRecorder.addEventListener("stop", () => {
      const mimeType = (this.audioChunks[0] && this.audioChunks[0].type) || (this.mediaRecorder && this.mediaRecorder.mimeType) || "audio/webm";
      const audioBlob = new Blob(this.audioChunks, {type: mimeType});
      this.audioChunks = [];
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      this.mediaRecorder = null;
      this.sendTestStt(audioBlob);
    });

    this.mediaRecorder.start(100);
    this.setState({isRecording: true, transcript: ""});
  }

  stopRecording() {
    if (this.mediaRecorder && this.state.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (_e) {
        // ignore
      }
      this.setState({isRecording: false});
    }
  }

  convertToWav(audioBlob) {
    return new Promise((resolve, reject) => {
      if (!audioBlob || audioBlob.size === 0) {
        reject(new Error("Invalid audio data: empty or null blob"));
        return;
      }
      if (audioBlob.type === "audio/wav") {
        resolve(audioBlob);
        return;
      }

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor({sampleRate: 16000});

      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target.result || e.target.result.byteLength === 0) {
          reject(new Error("Audio data is empty after reading file"));
          return;
        }
        audioContext.decodeAudioData(e.target.result)
          .then(buffer => {
            try {
              const wavBuffer = bufferToWav(buffer, 16000);
              resolve(new Blob([wavBuffer], {type: "audio/wav"}));
            } catch (wavError) {
              reject(wavError);
            }
          })
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  async sendTestStt(audioBlob) {
    const {provider, originalProvider} = this.props;

    this.setState({isTranscribing: true});
    try {
      await checkProvider(provider, originalProvider);

      const wavBlob = await this.convertToWav(audioBlob);
      const providerId = `${provider.owner}/${provider.name}`;
      const result = await SttBackend.testSpeechToTextProvider(providerId, wavBlob);
      if (result.status === "ok") {
        const text = typeof result.data === "string" ? result.data : (result.data && result.data.text) || "";
        this.setState({transcript: text});
        Setting.showMessage("success", i18next.t("provider:Speech recognition completed"));
      } else {
        Setting.showMessage("error", result.msg || i18next.t("general:Failed to get"));
      }
    } catch (error) {
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error.message}`);
    } finally {
      this.setState({isTranscribing: false});
    }
  }

  render() {
    const {provider} = this.props;

    if (!provider || provider.category !== "Speech-to-Text") {
      return null;
    }

    const {isRecording, isTranscribing, transcript} = this.state;

    return (
      <React.Fragment>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:Provider test"), i18next.t("provider:Provider test - Tooltip"))} :
          </Col>
          <Col span={10} >
            <TextArea rows={1} autoSize={{minRows: 1, maxRows: 5}} value={transcript} readOnly placeholder={i18next.t("chat:Speak")} />
          </Col>
          <Col span={6} >
            <Button
              style={{marginLeft: "10px", marginBottom: "5px"}}
              type={isRecording ? "default" : "primary"}
              danger={isRecording}
              icon={isTranscribing ? <LoadingOutlined /> : <AudioOutlined />}
              disabled={isTranscribing}
              onClick={() => {
                if (isRecording) {
                  this.stopRecording();
                } else {
                  this.startRecording();
                }
              }}
            >
              {isRecording ? i18next.t("chat:Stop") : (isTranscribing ? i18next.t("general:Loading") : i18next.t("chat:Speak"))}
            </Button>
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}

export default TestSttWidget;
