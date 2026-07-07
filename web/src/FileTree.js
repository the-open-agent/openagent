// Copyright 2023 The OpenAgent Authors. All Rights Reserved.
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
import {withRouter} from "react-router-dom";
import {Button, Card, Col, Descriptions, Empty, Input, Modal, Popconfirm, Radio, Result, Row, Spin, Tooltip, Tree, Upload} from "antd";
import {CloudUploadOutlined, DeleteOutlined, DownloadOutlined, FileDoneOutlined, FolderAddOutlined, InfoCircleTwoTone, UploadOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as TreeFileBackend from "./backend/TreeFileBackend";
import DocViewer, {DocViewerRenderers} from "@cyntler/react-doc-viewer";
import FileViewer from "react-file-viewer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import i18next from "i18next";
import * as PermissionBackend from "./backend/PermissionBackend";
import * as PermissionUtil from "./PermissionUtil";
import * as Conf from "./Conf";
import FileTable from "./table/FileTable";
import Editor from "./common/Editor";

const {Search} = Input;

class FileTree extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      expandedKeys: ["0-0", "0-0-0", "0-0-0-0"],
      checkedKeys: [],
      checkedFiles: [],
      selectedKeys: [],
      selectedFile: null,
      loading: false,
      text: null,
      newFolder: null,
      permissions: null,
      permissionMap: null,
      searchValue: "",
      isUploadFileModalVisible: false,
      uploadFileType: null,
      file: null,
      info: null,
    };

    this.filePane = React.createRef();
    this.uploadedFileIdMap = {};
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
    this.applyInitialSelection();
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.store && this.props.store) {
      this.applyInitialSelection();
    }
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown(e) {
    if (e.key === "Delete" && this.state.checkedFiles.length > 0) {
      e.preventDefault();
      this.batchDeleteFiles();
    }
  }

  UNSAFE_componentWillMount() {
    // Only store managers can view/edit file permissions; plain viewers must not
    // hit the admin-gated permissions endpoint (it would just error for them).
    if (Setting.isLocalAndStoreAdminUser(this.props.account)) {
      this.getPermissions();
    }
  }

  batchDeleteFiles() {
    Modal.confirm({
      title: i18next.t("general:Confirm deletion"),
      content: i18next.t("store:Are you sure you want to delete the selected items?"),
      okText: i18next.t("general:OK"),
      cancelText: i18next.t("general:Cancel"),
      onOk: () => {
        this.state.checkedFiles.forEach(file => {
          this.deleteFile(file, file.isLeaf);
        });
        this.setState({
          checkedKeys: [],
          checkedFiles: [],
        });
      },
    });
  }

  getPermissionMap(permissions) {
    const permissionMap = {};
    permissions.forEach((permission, index) => {
      if (permissionMap[permission.resources[0]] === undefined) {
        permissionMap[permission.resources[0]] = [];
      }
      permissionMap[permission.resources[0]].push(permission);
    });
    return permissionMap;
  }

  getPermissions() {
    PermissionBackend.getPermissions(Conf.AuthConfig.organizationName)
      .then((res) => {
        if (res.status === "ok") {
          const permissions = res.data.filter(permission => (permission.domains[0] === this.props.store.name) && permission.users.length !== 0);
          this.setState({
            permissions: permissions,
            permissionMap: this.getPermissionMap(permissions),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  updateStore(store) {
    this.props.onUpdateStore(store);
  }

  checkUploadFile() {
    return false;
  }

  renderUploadFileModal() {
    return (
      <Modal title={
        <div>
          <InfoCircleTwoTone twoToneColor="rgb(45,120,213)" />
          {" " + i18next.t("store:Please choose the type of your data")}
        </div>
      }
      open={this.state.isUploadFileModalVisible}
      onCancel={() => {
        this.setState({
          isUploadFileModalVisible: false,
        });
      }}
      width={"360px"}
      footer={null} >
        <Radio.Group buttonStyle="solid" onChange={e => {
          this.setState({
            uploadFileType: e.target.value,
            isUploadFileModalVisible: false,
          });

          const uploadFileType = e.target.value;

          const newInfo = Setting.deepCopy(this.state.info);
          if (uploadFileType !== "Other") {
            for (let i = 0; i < newInfo.fileList.length; i++) {
              const filename = newInfo.fileList[i].name;
              if (filename.endsWith(".txt")) {
                newInfo.fileList[i].name = `${uploadFileType}_${newInfo.fileList[i].name}`;
              }
            }
          }
          this.uploadFile(this.state.file, newInfo);
        }} value={this.state.uploadFileType}>
          <Radio.Button value={"ECG"}>ECG</Radio.Button>
          <Radio.Button value={"Impedance"}>Impedance</Radio.Button>
          {/* <Radio.Button value={"EEG"}>EEG</Radio.Button>*/}
          <Radio.Button value={"Other"}>{i18next.t("general:Other")}</Radio.Button>
        </Radio.Group>
      </Modal>
    );
  }

  uploadFiles(file, files) {
    const info = {
      fileList: Array.from(files).map(file => {
        file.uid = Date.now() + Math.floor(Math.random() * 1000);
        return {
          name: file.name,
          originFileObj: file,
        };
      }),
    };
    this.uploadFile(file, info);
  }

  uploadFile(file, info) {
    const storeId = `${this.props.store.owner}/${this.props.store.name}`;

    const promises = [];
    info.fileList.forEach((uploadedFile, index) => {
      if (this.uploadedFileIdMap[uploadedFile.originFileObj.uid] === 1) {
        return;
      } else {
        this.uploadedFileIdMap[uploadedFile.originFileObj.uid] = 1;
      }

      promises.push(TreeFileBackend.addFile(storeId, file.key, true, uploadedFile.name, uploadedFile.originFileObj));
    });

    Promise.all(promises)
      .then((values) => {
        if (promises.length === 0) {
          // no new file was uploaded
          return;
        }
        let hasError = false;
        values.forEach((res, _index) => {
          if (res.status !== "ok") {
            hasError = true;
            Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
          }
        });
        if (!hasError) {
          Setting.showMessage("success", i18next.t("general:Successfully uploaded"));
        }
        this.props.onRefresh();
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  addFile(file, newFolder) {
    const storeId = `${this.props.store.owner}/${this.props.store.name}`;
    TreeFileBackend.addFile(storeId, file.key, false, newFolder, null)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.onRefresh();
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  deleteFile(file, isLeaf) {
    const storeId = `${this.props.store.owner}/${this.props.store.name}`;
    TreeFileBackend.deleteFile(storeId, file.key, isLeaf)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data === true) {
            Setting.showMessage("success", i18next.t("general:Successfully deleted"));
            this.props.onRefresh();
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${error}`);
      });
  }

  renderPermission(permission, isReadable) {
    if (!isReadable) {
      const userId = `${this.props.account.owner}/${this.props.account.name}`;
      if (!permission.users.includes(userId)) {
        return null;
      }
    }

    return (
      <span key={permission.name}
        onClick={(e) => {
          Setting.openLink(Setting.getMyProfileUrl(this.props.account).replace("/account", `/permissions/${permission.owner}/${permission.name}`));
          e.stopPropagation();
        }}
      >
        {
          permission.users.map(user => {
            const username = user.split("/")[1];
            return (
              <span key={username}>
                {
                  Setting.getTag(username, permission.actions[0], permission.state)
                }
              </span>
            );
          })
        }
      </span>
    );
  }

  renderPermissions(permissions, isReadable) {
    if (permissions === undefined) {
      return null;
    }

    return permissions.map(permission => this.renderPermission(permission, isReadable)).filter(permission => permission !== null);
  }

  isActionIncluded(action1, action2) {
    if (action1 === "Read") {
      return true;
    } else if (action1 === "Write" && action2 !== "Read") {
      return true;
    } else if (action1 === "Admin" && action2 === "Admin") {
      return true;
    } else {
      return false;
    }
  }

  isFileOk(file, action) {
    if (Setting.isLocalAndStoreAdminUser(this.props.account)) {
      return true;
    }

    if (this.state.permissionMap === null) {
      return false;
    }

    const permissions = this.state.permissionMap[file.key];
    if (permissions !== undefined) {
      for (let i = 0; i < permissions.length; i++) {
        const permission = permissions[i];

        const userId = `${this.props.account.owner}/${this.props.account.name}`;
        if (permission.state === "Approved" && permission.isEnabled === true && permission.resources[0] === file.key && permission.users.includes(userId) && this.isActionIncluded(action, permission.actions[0])) {
          return true;
        }
      }
    }

    if (file.parent !== undefined) {
      return this.isFileOk(file.parent, action);
    }
    return false;
  }

  isFileReadable(file) {
    if (Setting.isLocalAndStoreAdminUser(this.props.account)) {
      return true;
    }

    return this.isFileOk(file, "Read");
  }

  isFileWritable(file) {
    if (Setting.isLocalAndStoreAdminUser(this.props.account)) {
      return true;
    }

    return this.isFileOk(file, "Write");
  }

  isFileAdmin(file) {
    if (Setting.isLocalAndStoreAdminUser(this.props.account)) {
      return true;
    }

    return this.isFileOk(file, "Admin");
  }

  renderSearch() {
    return (
      <Search placeholder={i18next.t("store:Please input your search term")} onChange={(e) => {
        this.setState({
          searchValue: e.target.value,
          selectedKeys: [],
          selectedFile: null,
        });
      }} />
    );
  }

  findFileNodeByKey(file, targetKey) {
    if (!file) {
      return null;
    }

    if (file.key === targetKey) {
      return file;
    }

    if (!file.children?.length) {
      return null;
    }

    for (const child of file.children) {
      const found = this.findFileNodeByKey(child, targetKey);
      if (found) {
        return found;
      }
    }

    return null;
  }

  applyInitialSelection() {
    const {store, initialFileKey} = this.props;

    if (!store?.fileTree || !initialFileKey) {
      return;
    }

    if (this.state.selectedKeys.length !== 0 || this.state.selectedFile !== null) {
      return;
    }

    const targetKey = initialFileKey.replace(/^\/+/, "").replace(/\/+$/, "");
    const file = this.findFileNodeByKey(store.fileTree, targetKey);
    if (!file?.isLeaf) {
      return;
    }

    this.setState({
      checkedKeys: [],
      checkedFiles: [],
      selectedKeys: [file.key],
      selectedFile: file,
    });

    const ext = Setting.getExtFromPath(file.key);
    if (ext && file.url && !this.isExtForDocViewer(ext) && !this.isExtForFileViewer(ext)) {
      this.setState({loading: true});

      fetch(file.url, {
        method: "GET",
        credentials: "include",
      })
        .then(res => res.text())
        .then(res => {
          this.setState({
            text: res,
            loading: false,
          });
        })
        .catch(() => {
          this.setState({loading: false});
        });
    }
  }

  renderTree(store) {
    const onSelect = (selectedKeys, info) => {
      if (!this.isFileReadable(info.node)) {
        Setting.showMessage("error", i18next.t("store:Sorry, you are unauthorized to access this file or folder"));
        return;
      }

      if (selectedKeys.length !== 0) {
        const fetchFile = () => {
          const path = selectedKeys[0];
          const ext = Setting.getExtFromPath(path);
          if (ext !== "") {
            const url = info.node.url;

            if (!this.isExtForDocViewer(ext) && !this.isExtForFileViewer(ext)) {
              this.setState({
                loading: true,
              });

              fetch(url, {
                method: "GET",
                credentials: "include",
              })
                .then(res => res.text())
                .then(res => {
                  this.setState({
                    text: res,
                    loading: false,
                  });
                });
            }
          }
        };

        fetchFile();
      }

      this.setState({
        checkedKeys: [],
        checkedFiles: [],
        selectedKeys: selectedKeys,
        selectedFile: info.node,
      });
    };

    const onCheck = (checkedKeys, info) => {
      this.setState({
        checkedKeys: checkedKeys,
        checkedFiles: info.checkedNodes,
        selectedKeys: [],
        selectedFile: null,
      });
    };

    let fileTree = Setting.getTreeWithParents(store.fileTree);
    if (this.state.searchValue !== "") {
      fileTree = Setting.getTreeWithSearch(fileTree, this.state.searchValue);
    }

    return (
      <Tree
        height={"calc(100vh - 220px)"}
        virtual={true}
        className="draggable-tree"
        multiple={false}
        checkable
        defaultExpandAll={true}
        // defaultExpandedKeys={tree.children.map(file => file.key)}
        draggable={false}
        blockNode
        showLine={true}
        showIcon={true}
        onCheck={onCheck}
        checkedKeys={this.state.checkedKeys}
        onSelect={onSelect}
        selectedKeys={this.state.selectedKeys}
        treeData={[fileTree]}
        titleRender={(file) => {
          const isReadable = this.isFileReadable(file);
          const isWritable = this.isFileWritable(file);
          const isAdmin = this.isFileAdmin(file);

          let tagStyle = {};
          if (!isReadable && !isWritable && !isAdmin) {
            tagStyle = {color: "rgba(100,100,100,0.6)", backgroundColor: "rgba(225,225,225,0.4)"};
          }

          const targetKey = file.isLeaf ? file.parentKey : file.key;
          const isDraggingOver = this.state.dragOverKey === targetKey;

          const handleDragOver = (e) => {
            e.preventDefault();
            this.setState({dragOverKey: targetKey});
          };

          const handleDragLeave = (e) => {
            e.preventDefault();
            this.setState({dragOverKey: null});
          };

          const handleDrop = (e) => {
            e.preventDefault();
            this.setState({dragOverKey: null});

            const files = Array.from(e.dataTransfer.files || []);
            if (files.length === 0) {return;}
            if (!file.isLeaf) {
              this.uploadFiles?.(file, files);
            }
          };

          if (file.isLeaf) {
            return (
              <Tooltip color={"rgb(255,255,255,0.8)"} placement="right" title={
                <div>
                  {
                    !isReadable ? null : (
                      <Tooltip title={i18next.t("general:Download")}>
                        <Button style={{marginRight: "5px"}} icon={<DownloadOutlined />} size="small" onClick={(e) => {
                          Setting.showMessage("success", i18next.t("general:Successfully downloaded"));
                          Setting.openLink(file.url);
                          e.stopPropagation();
                        }} />
                      </Tooltip>
                    )
                  }
                  {
                    !isWritable ? null : (
                      <React.Fragment>
                        <Tooltip title={i18next.t("general:Delete")}>
                          <span onClick={(e) => e.stopPropagation()}>
                            <Popconfirm
                              title={`${i18next.t("general:Sure to delete")}: ${file.title} ?`}
                              onConfirm={(e) => {
                                this.deleteFile(file, true);
                              }}
                              okText={i18next.t("general:OK")}
                              cancelText={i18next.t("general:Cancel")}
                            >
                              <Button style={{marginRight: "5px"}} icon={<DeleteOutlined />} size="small" />
                            </Popconfirm>
                          </span>
                        </Tooltip>
                      </React.Fragment>
                    )
                  }
                  <Tooltip title={isAdmin ? i18next.t("store:Add Permission") :
                    i18next.t("store:Apply for Permission")}>
                    <Button icon={<FileDoneOutlined />} size="small" onClick={(e) => {
                      PermissionUtil.addPermission(this.props.account, this.props.store, isAdmin, file);
                      e.stopPropagation();
                    }} />
                  </Tooltip>
                </div>
              }>
                <span style={tagStyle}>
                  {`${file.title} (${Setting.getFriendlyFileSize(file.size)})`}
                </span>
                &nbsp;
                &nbsp;
                {
                  (this.state.permissionMap === null) ? null : this.renderPermissions(this.state.permissionMap[file.key], isReadable)
                }
              </Tooltip>
            );
          } else {
            return (
              <div
                style={{background: isDraggingOver ? "rgba(24,144,255,0.15)" : "transparent", transition: "background 0.2s", gap: "8px"}}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Setting.IconFont type="icon-testfolder" />
                <Tooltip color={"rgb(255,255,255,0.8)"} placement="right" title={
                  <div>
                    {
                      !isWritable ? null : (
                        <React.Fragment>
                          <Tooltip color={"rgb(255,255,255)"} placement="top" title={
                            <span onClick={(e) => e.stopPropagation()}>
                              <div style={{color: "black"}}>
                                {i18next.t("store:New folder")}:
                              </div>
                              <Input.Group style={{marginTop: "5px"}} compact>
                                <Input style={{width: "100px"}} value={this.state.newFolder} onChange={e => {
                                  this.setState({
                                    newFolder: e.target.value,
                                  });
                                }} />
                                <Button type="primary" onClick={(e) => {
                                  this.addFile(file, this.state.newFolder);
                                  e.stopPropagation();
                                }}
                                >
                                  OK
                                </Button>
                              </Input.Group>
                            </span>
                          }>
                            <span onClick={(e) => e.stopPropagation()}>
                              <Button style={{marginRight: "5px"}} icon={<FolderAddOutlined />} size="small" onClick={(e) => {
                                e.stopPropagation();
                              }} />
                            </span>
                          </Tooltip>
                          <Tooltip title={i18next.t("store:Upload file")}>
                            <span onClick={(e) => e.stopPropagation()}>
                              <Upload directory={false} multiple={true} accept="*" showUploadList={false} beforeUpload={file => {return false;}} onChange={(info) => {
                                if (this.checkUploadFile(info)) {
                                  this.setState({
                                    isUploadFileModalVisible: true,
                                    file: file,
                                    info: info,
                                  });
                                } else {
                                  this.uploadFile(file, info);
                                }
                              }}
                              >
                                <Button style={{marginRight: "5px"}} icon={<CloudUploadOutlined />} size="small" />
                              </Upload>
                            </span>
                          </Tooltip>
                          <Tooltip title={i18next.t("store:Upload folder")}>
                            <span onClick={(e) => e.stopPropagation()}>
                              <Upload directory={true} multiple={true} accept="*" showUploadList={false} beforeUpload={file => {return false;}} onChange={(info) => {
                                if (this.checkUploadFile(info)) {
                                  this.setState({
                                    isUploadFileModalVisible: true,
                                    file: file,
                                    info: info,
                                  });
                                } else {
                                  this.uploadFile(file, info);
                                }
                              }}
                              >
                                <Button style={{marginRight: "5px"}} icon={<UploadOutlined />} size="small" />
                              </Upload>
                            </span>
                          </Tooltip>
                          {
                            file.key === "/" ? null : (
                              <Tooltip title={i18next.t("general:Delete")}>
                                <span onClick={(e) => e.stopPropagation()}>
                                  <Popconfirm
                                    title={`${i18next.t("general:Sure to delete")}: ${file.title} ?`}
                                    onConfirm={(e) => {
                                      this.deleteFile(file, false);
                                    }}
                                    okText={i18next.t("general:OK")}
                                    cancelText={i18next.t("general:Cancel")}
                                  >
                                    <Button style={{marginRight: "5px"}} icon={<DeleteOutlined />} size="small" />
                                  </Popconfirm>
                                </span>
                              </Tooltip>
                            )
                          }
                        </React.Fragment>
                      )
                    }
                    <Tooltip title={isAdmin ? i18next.t("store:Add Permission") :
                      i18next.t("store:Apply for Permission")}>
                      <Button icon={<FileDoneOutlined />} size="small" onClick={(e) => {
                        PermissionUtil.addPermission(this.props.account, this.props.store, isAdmin, file);
                        e.stopPropagation();
                      }} />
                    </Tooltip>
                  </div>
                }>
                  <span style={tagStyle}>
                    {file.title}
                  </span>
                  &nbsp;
                  &nbsp;
                  {
                    (this.state.permissionMap === null) ? null : this.renderPermissions(this.state.permissionMap[file.key], isReadable)
                  }
                </Tooltip>
              </div>
            );
          }
        }}
        icon={(file) => {
          if (file.isLeaf) {
            return <Setting.IconFont type={Setting.getFileIconType(file.data.key)} />;
          }
        }}
      />
    );
  }

  isExtForDocViewer(ext) {
    return ["bmp", "jpg", "jpeg", "png", "tiff", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "pdf", "csv"].includes(ext);
  }

  isExtForFileViewer(ext) {
    return ["png", "jpg", "jpeg", "gif", "bmp", "pdf", "xlsx", "docx", "mp4", "webm", "mp3"].includes(ext);
  }

  isExtForMarkdownViewer(ext) {
    return ["md"].includes(ext);
  }

  renderFileViewer(store) {
    if (this.state.checkedFiles.length !== 0) {
      const outerFile = {children: this.state.checkedFiles};
      return (
        <FileTable account={this.props.account} store={this.props.store} onRefresh={() => this.props.onRefresh()} file={outerFile} isCheckMode={true} />
      );
    }

    if (this.state.selectedKeys.length === 0) {
      return null;
    }

    const file = this.state.selectedFile;
    if (file === null) {
      return null;
    }

    const path = this.state.selectedKeys[0];
    const filename = path.split("/").pop();

    if (!file.isLeaf) {
      return (
        <FileTable account={this.props.account} store={this.props.store} onRefresh={() => this.props.onRefresh()} file={file} isCheckMode={false} />
      );
    }

    if (!filename.includes(".")) {
      return (
        <div style={{height: this.getEditorHeightCss()}}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    const ext = Setting.getExtFromPath(path);
    const url = this.state.selectedFile.url;

    if (this.isExtForDocViewer(ext)) {
      // https://github.com/Alcumus/react-doc-viewer
      return (
        <DocViewer
          key={path}
          className="filetree-doc-viewer"
          style={{width: "100%", maxWidth: "100%", height: this.getEditorHeightCss(), border: "1px solid rgb(242,242,242)", borderRadius: "6px"}}
          pluginRenderers={DocViewerRenderers}
          documents={[{uri: url}]}
          theme={{
            primary: "#ffffff",
            secondary: "#ffffff",
            tertiary: "rgba(0, 0, 0, 0.05)",
            text_primary: Setting.getThemeColor(),
            text_secondary: Setting.getThemeColor(),
            text_tertiary: "rgba(0, 0, 0, 0.45)",
            disableThemeScrollbar: true,
          }}
          config={{
            header: {
              disableHeader: true,
              disableFileName: true,
              retainURLParams: false,
            },
          }}
        />
      );
    } else if (this.isExtForFileViewer(ext)) {
      // https://github.com/plangrid/react-file-viewer
      return (
        <a target="_blank" rel="noreferrer" href={url}>
          <FileViewer
            key={path}
            fileType={ext}
            filePath={url}
            errorComponent={<div>error</div>}
            onError={(error) => {
              Setting.showMessage("error", error);
            }}
          />
        </a>
      );
    } else if (this.isExtForMarkdownViewer(ext)) {
      // https://github.com/remarkjs/react-markdown
      return (
        <div className="markdownContainer" style={{height: this.getEditorHeightCss(), overflow: "auto", border: "1px solid rgb(242,242,242)", borderRadius: "6px"}}>
          <ReactMarkdown
            key={path}
            remarkPlugins={[remarkGfm, remarkFrontmatter]}
          >
            {this.state.text}
          </ReactMarkdown>
        </div>
      );
    } else {
      // https://github.com/scniro/react-codemirror2
      if (this.state.loading) {
        return (
          <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 120px)"}}>
            <Spin size="large" tip={i18next.t("general:Loading...")} />
          </div>
        );
      }

      return (
        <div style={{height: this.getEditorHeightCss()}}>
          <Editor
            key={path}
            value={this.state.text}
            fillHeight
          />
        </div>
      );
    }
  }

  getPropertyValue(file, propertyName) {
    if (!this.props.store.propertiesMap) {
      return "";
    }

    const properties = this.props.store.propertiesMap[file.key];
    if (properties === undefined) {
      return "";
    } else {
      return properties[propertyName];
    }
  }

  setPropertyValue(file, propertyName, value) {
    const store = this.props.store;
    if (store.propertiesMap[file.key] === undefined) {
      store.propertiesMap[file.key] = {};
    }
    store.propertiesMap[file.key][propertyName] = value;
    this.updateStore(store);
  }

  getMomentTime(t) {
    if (t === "") {
      return "";
    } else {
      return new moment(t);
    }
  }

  renderProperties() {
    if (this.state.selectedKeys.length === 0) {
      return null;
    }

    const file = this.state.selectedFile;
    if (file === null) {
      return null;
    }

    return (
      <div ref={this.filePane}>
        <Descriptions
          style={{backgroundColor: "white"}}
          labelStyle={{backgroundColor: "rgb(245,245,245)"}}
          bordered
          // title="Custom Size"
          size="small"
          // extra={<Button type="primary">Edit</Button>}
        >
          <Descriptions.Item label={i18next.t("store:File name")}>
            {file.title}
          </Descriptions.Item>
          <Descriptions.Item label={i18next.t("store:File size")}>
            {Setting.getFriendlyFileSize(file.size)}
          </Descriptions.Item>
          <Descriptions.Item label={i18next.t("general:Created time")}>
            {Setting.getFormattedDate(file.createdTime)}
          </Descriptions.Item>
        </Descriptions>
      </div>
    );
  }

  getEditorHeightCss() {
    // 79, 123
    let filePaneHeight = this.filePane.current?.offsetHeight;
    if (!filePaneHeight) {
      filePaneHeight = 0;
    }

    return `calc(100vh - ${filePaneHeight + 136}px)`;
  }

  render() {
    if (this.props.store.fileTree === null) {
      if (this.props.store.error) {
        return (
          <div className="App">
            <Result
              status="error"
              title={`${this.props.store.error}`}
              extra={
                <Button type="primary" onClick={() => this.props.history.push(`/stores/${this.props.store.owner}/${this.props.store.name}`)}>
                  Go to Store
                </Button>
              }
            />
          </div>
        );
      }
      return <Empty description={i18next.t("general:No data")} />;
    }

    return (
      <div>
        <Row>
          <Col span={8}>
            <Card className="content-warp-card-filetreeleft" style={{marginRight: "10px"}}>
              <div style={{margin: "-25px"}}>
                {
                  this.renderSearch(this.props.store)
                }
                {
                  this.renderTree(this.props.store)
                }
              </div>
            </Card>
          </Col>
          <Col span={16}>
            <Card className="content-warp-card-filetreeright">
              <div style={{margin: "-25px"}}>
                <div style={{height: this.getEditorHeightCss(), border: "1px solid rgb(242,242,242)", borderRadius: "6px"}}>
                  {
                    this.renderFileViewer(this.props.store)
                  }
                </div>
                {
                  this.renderProperties()
                }
              </div>
            </Card>
          </Col>
        </Row>
        {
          this.renderUploadFileModal()
        }
      </div>
    );
  }
}

export default withRouter(FileTree);
