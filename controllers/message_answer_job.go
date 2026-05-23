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

package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/the-open-agent/openagent/object"
)

const messageAnswerJobRetention = 5 * time.Minute

var errMessageAnswerCanceled = errors.New("message answer canceled")

var messageAnswerJobs = newMessageAnswerJobManager()

type messageAnswerJobManager struct {
	mu   sync.Mutex
	jobs map[string]*messageAnswerJob
}

func newMessageAnswerJobManager() *messageAnswerJobManager {
	return &messageAnswerJobManager{
		jobs: map[string]*messageAnswerJob{},
	}
}

func (m *messageAnswerJobManager) getOrStart(id string, host string, lang string, signedIn bool) *messageAnswerJob {
	m.mu.Lock()
	if job, ok := m.jobs[id]; ok {
		m.mu.Unlock()
		return job
	}
	m.mu.Unlock()

	job := newMessageAnswerJob(id)
	if message, err := object.GetMessage(id); err != nil {
		job.appendChunk([]byte(fmt.Sprintf("event: myerror\ndata: %s\n\n", err.Error())))
		job.finish()
		return job
	} else if message != nil && message.Text != "" {
		jsonData, err := ConvertMessageDataToJSON(message.Text)
		if err != nil {
			job.appendChunk([]byte(fmt.Sprintf("event: myerror\ndata: %s\n\n", err.Error())))
		} else {
			job.appendChunk([]byte(fmt.Sprintf("event: message\ndata: %s\n\n", jsonData)))
			job.appendChunk([]byte("event: end\ndata: end\n\n"))
		}
		job.finish()
		return job
	}

	m.mu.Lock()
	if existing, ok := m.jobs[id]; ok {
		m.mu.Unlock()
		return existing
	}
	m.jobs[id] = job
	m.mu.Unlock()

	go func() {
		defer job.finish()
		generateMessageAnswer(id, job.writer, host, lang, signedIn, nil)
	}()

	return job
}

func (m *messageAnswerJobManager) cancel(id string) bool {
	m.mu.Lock()
	job, ok := m.jobs[id]
	m.mu.Unlock()
	if !ok {
		return false
	}

	job.cancel()
	return true
}

func (m *messageAnswerJobManager) remove(id string, job *messageAnswerJob) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if current, ok := m.jobs[id]; ok && current == job {
		delete(m.jobs, id)
	}
}

type messageAnswerJob struct {
	id     string
	writer *messageAnswerJobWriter

	mu          sync.Mutex
	chunks      [][]byte
	subscribers map[chan []byte]struct{}
	done        bool
	canceled    bool
}

func newMessageAnswerJob(id string) *messageAnswerJob {
	job := &messageAnswerJob{
		id:          id,
		subscribers: map[chan []byte]struct{}{},
	}
	job.writer = &messageAnswerJobWriter{
		header: http.Header{},
		job:    job,
	}
	return job
}

func (j *messageAnswerJob) appendChunk(p []byte) {
	data := append([]byte(nil), p...)

	j.mu.Lock()
	defer j.mu.Unlock()

	j.chunks = append(j.chunks, data)
	for ch := range j.subscribers {
		select {
		case ch <- data:
		default:
			close(ch)
			delete(j.subscribers, ch)
		}
	}
}

func (j *messageAnswerJob) subscribe() ([][]byte, <-chan []byte, func(), bool) {
	ch := make(chan []byte, 256)

	j.mu.Lock()
	replay := make([][]byte, 0, len(j.chunks))
	for _, chunk := range j.chunks {
		replay = append(replay, append([]byte(nil), chunk...))
	}
	done := j.done
	if !done {
		j.subscribers[ch] = struct{}{}
	}
	j.mu.Unlock()

	unsubscribe := func() {
		j.mu.Lock()
		if _, ok := j.subscribers[ch]; ok {
			delete(j.subscribers, ch)
			close(ch)
		}
		j.mu.Unlock()
	}

	return replay, ch, unsubscribe, done
}

func (j *messageAnswerJob) finish() {
	j.mu.Lock()
	if j.done {
		j.mu.Unlock()
		return
	}

	j.done = true
	for ch := range j.subscribers {
		close(ch)
		delete(j.subscribers, ch)
	}
	j.mu.Unlock()

	time.AfterFunc(messageAnswerJobRetention, func() {
		messageAnswerJobs.remove(j.id, j)
	})
}

func (j *messageAnswerJob) cancel() {
	j.mu.Lock()
	if j.done || j.canceled {
		j.mu.Unlock()
		return
	}
	j.canceled = true
	j.mu.Unlock()

	j.appendChunk([]byte("event: end\ndata: canceled\n\n"))
	j.finish()
}

type messageAnswerJobWriter struct {
	header http.Header
	job    *messageAnswerJob
	status int
}

func (w *messageAnswerJobWriter) Header() http.Header {
	return w.header
}

func (w *messageAnswerJobWriter) WriteHeader(statusCode int) {
	w.status = statusCode
}

func (w *messageAnswerJobWriter) Write(p []byte) (int, error) {
	if w.job != nil {
		w.job.mu.Lock()
		canceled := w.job.canceled
		w.job.mu.Unlock()
		if canceled {
			return 0, errMessageAnswerCanceled
		}
		w.job.appendChunk(p)
	}
	return len(p), nil
}

func (w *messageAnswerJobWriter) Flush() {}

func cancelMessageAnswer(id string) {
	messageAnswerJobs.cancel(id)
}

func cancelChatAnswerJobs(chat string) {
	messages, err := object.GetChatMessages(chat)
	if err != nil {
		return
	}
	for _, msg := range messages {
		if msg.Author == "AI" {
			messageAnswerJobs.cancel(msg.GetId())
		}
	}
}

func cancelMessageAnswersFromTime(chat string, fromCreatedTime string) error {
	messages, err := object.GetChatMessages(chat)
	if err != nil {
		return err
	}
	for _, msg := range messages {
		if msg.Author == "AI" && msg.CreatedTime >= fromCreatedTime {
			messageAnswerJobs.cancel(msg.GetId())
		}
	}
	return nil
}

func cancelStaleChatAnswerJobs(chat string, keepAnswerName string) {
	messages, err := object.GetChatMessages(chat)
	if err != nil {
		return
	}
	for _, msg := range messages {
		if msg.Author == "AI" && msg.Text == "" && msg.ErrorText == "" && msg.Name != keepAnswerName {
			messageAnswerJobs.cancel(msg.GetId())
		}
	}
}
