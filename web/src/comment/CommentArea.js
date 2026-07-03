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

import React, {useCallback, useEffect, useState} from "react";
import {Button, Card, Empty, Input, List, Modal, Pagination, Space, Typography} from "antd";
import {CommentOutlined, DeleteOutlined} from "@ant-design/icons";
import i18next from "i18next";
import * as CommentBackend from "../backend/CommentBackend";
import * as Setting from "../Setting";
import UserLabel from "../common/UserLabel";

const {Text, Paragraph} = Typography;
const {TextArea} = Input;
const maxCommentLength = 1000;
const pageSize = 10;

function getCommentId(comment) {
  return `${comment.owner}/${comment.name}`;
}

function getQuoteText(content) {
  const text = (content || "").replace(/\s+/g, " ").trim();
  const chars = Array.from(text);
  if (chars.length <= 10) {
    return text;
  }
  return `${chars.slice(0, 10).join("")}...`;
}

function getCommentTime(time) {
  const formattedTime = Setting.getFormattedDate(time);
  if (!formattedTime) {
    return "";
  }
  return formattedTime.split(".")[0].trim();
}

function canDeleteComment(account, comment, targetOwner) {
  if (!account || !comment) {
    return false;
  }
  return account.name === comment.owner || account.name === targetOwner || Setting.isAdminUser(account);
}

function renderEditor({value, onChange, onSubmit, submitting, placeholder}) {
  const disabled = value.trim() === "";
  return (
    <div>
      <TextArea
        value={value}
        maxLength={maxCommentLength}
        placeholder={placeholder}
        autoSize={{minRows: 3, maxRows: 8}}
        onChange={e => onChange(e.target.value)}
      />
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap"}}>
        <Text type="secondary">{Array.from(value).length} / {maxCommentLength}</Text>
        <Button type="primary" icon={<CommentOutlined />} disabled={disabled} loading={submitting} onClick={onSubmit}>
          {i18next.t("store:Add comment")}
        </Button>
      </div>
    </div>
  );
}

function CommentActions({account, comment, targetOwner, onOpenReply, onDelete}) {
  const canComment = account && !Setting.isAnonymousUser(account);

  return (
    <Space size={12}>
      {canComment ? (
        <Button type="link" size="small" style={{padding: 0}} onClick={() => onOpenReply(comment)}>
          {i18next.t("store:Reply")}
        </Button>
      ) : null}
      {canDeleteComment(account, comment, targetOwner) ? (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} style={{padding: 0}} onClick={() => onDelete(comment)}>
          {i18next.t("general:Delete")}
        </Button>
      ) : null}
    </Space>
  );
}

function ReplyQuote({parentComment}) {
  if (!parentComment) {
    return null;
  }

  return (
    <div style={{margin: "6px 0 4px"}}>
      <Text
        type="secondary"
        style={{
          display: "inline-block",
          maxWidth: "min(360px, 100%)",
          paddingRight: 8,
          borderRight: "2px solid var(--ant-color-border)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          verticalAlign: "bottom",
        }}
      >
        : {getQuoteText(parentComment.content)}
      </Text>
    </div>
  );
}

function ReplyItem({account, reply, parentComment, targetOwner, replyTo, replyValue, replySubmitting, replyToOwner, onOpenReply, onChangeReply, onSubmitReply, onDelete}) {
  const replyId = getCommentId(reply);
  const isReplying = replyTo === replyId;

  return (
    <div style={{padding: "10px 0", borderBottom: "1px solid var(--ant-color-border-secondary)"}}>
      <div style={{display: "flex", gap: 10, alignItems: "flex-start"}}>
        <UserLabel user={reply.owner} account={account} size={28} avatarOnly />
        <div style={{flex: 1, minWidth: 0}}>
          <Space size={8} wrap>
            <UserLabel user={reply.owner} account={account} showAvatar={false} strong />
            <Text type="secondary" style={{fontSize: 12}}>{getCommentTime(reply.createdTime)}</Text>
          </Space>
          <ReplyQuote parentComment={parentComment} />
          <Paragraph style={{margin: "5px 0 8px", whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
            {reply.content}
          </Paragraph>
          <CommentActions account={account} comment={reply} targetOwner={targetOwner} onOpenReply={onOpenReply} onDelete={onDelete} />
          {isReplying ? (
            <div style={{marginTop: 10}}>
              {renderEditor({
                value: replyValue,
                onChange: onChangeReply,
                onSubmit: onSubmitReply,
                submitting: replySubmitting,
                placeholder: `${i18next.t("message:Reply to")} @${replyToOwner}`,
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RootCommentItem({account, comment, targetOwner, replyTo, replyValue, replySubmitting, replyToOwner, onOpenReply, onChangeReply, onSubmitReply, onDelete}) {
  const commentId = getCommentId(comment);
  const isReplying = replyTo === commentId;
  const replyMap = new Map((comment.replies || []).map(reply => [getCommentId(reply), reply]));

  return (
    <div style={{padding: "14px 0", borderBottom: "1px solid var(--ant-color-border-secondary)"}}>
      <div style={{display: "flex", gap: 12, alignItems: "flex-start"}}>
        <UserLabel user={comment.owner} account={account} size={32} avatarOnly />
        <div style={{flex: 1, minWidth: 0}}>
          <Space size={8} wrap>
            <UserLabel user={comment.owner} account={account} showAvatar={false} strong />
            <Text type="secondary" style={{fontSize: 12}}>{getCommentTime(comment.createdTime)}</Text>
          </Space>
          <Paragraph style={{margin: "6px 0 8px", whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
            {comment.content}
          </Paragraph>
          <CommentActions account={account} comment={comment} targetOwner={targetOwner} onOpenReply={onOpenReply} onDelete={onDelete} />
          {isReplying ? (
            <div style={{marginTop: 10}}>
              {renderEditor({
                value: replyValue,
                onChange: onChangeReply,
                onSubmit: onSubmitReply,
                submitting: replySubmitting,
                placeholder: `${i18next.t("message:Reply to")} @${replyToOwner}`,
              })}
            </div>
          ) : null}
          {comment.replies && comment.replies.length > 0 ? (
            <div style={{marginTop: 12, padding: "0 12px", borderLeft: "2px solid var(--ant-color-border-secondary)", backgroundColor: "var(--ant-color-fill-quaternary)"}}>
              {comment.replies.map(reply => (
                <ReplyItem
                  key={getCommentId(reply)}
                  account={account}
                  reply={reply}
                  parentComment={reply.parentOwner === comment.owner && reply.parentName === comment.name ? null : replyMap.get(`${reply.parentOwner}/${reply.parentName}`)}
                  targetOwner={targetOwner}
                  replyTo={replyTo}
                  replyValue={replyValue}
                  replySubmitting={replySubmitting}
                  replyToOwner={replyToOwner}
                  onOpenReply={onOpenReply}
                  onChangeReply={onChangeReply}
                  onSubmitReply={onSubmitReply}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CommentArea({account, targetType, targetKey, targetOwner, disabled = false, unavailableText = ""}) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState("");
  const [replyToOwner, setReplyToOwner] = useState("");
  const [replyToParentOwner, setReplyToParentOwner] = useState("");
  const [replyToParentName, setReplyToParentName] = useState("");
  const [replyValue, setReplyValue] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const canComment = account && !Setting.isAnonymousUser(account);

  const loadComments = useCallback((nextPage) => {
    if (disabled || !targetType || !targetKey) {
      return;
    }
    setLoading(true);
    CommentBackend.getComments(targetType, targetKey, nextPage, pageSize)
      .then(res => {
        if (res.status === "ok") {
          setComments(res.data || []);
          setTotal(res.data2 || 0);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
      })
      .finally(() => setLoading(false));
  }, [disabled, targetKey, targetType]);

  useEffect(() => {
    setPage(1);
    setReplyTo("");
    setReplyToOwner("");
    setReplyValue("");
    loadComments(1);
  }, [loadComments]);

  const submitComment = () => {
    const trimmedContent = content.trim();
    if (trimmedContent === "") {
      return;
    }
    setSubmitting(true);
    CommentBackend.addComment({targetType, targetKey, content: trimmedContent})
      .then(res => {
        if (res.status === "ok") {
          setContent("");
          setPage(1);
          loadComments(1);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      })
      .finally(() => setSubmitting(false));
  };

  const openReply = comment => {
    setReplyTo(getCommentId(comment));
    setReplyToOwner(comment.owner);
    setReplyToParentOwner(comment.owner);
    setReplyToParentName(comment.name);
    setReplyValue("");
  };

  const submitReply = () => {
    const trimmedContent = replyValue.trim();
    if (trimmedContent === "" || replyTo === "") {
      return;
    }
    setReplySubmitting(true);
    CommentBackend.addComment({targetType, targetKey, parentOwner: replyToParentOwner, parentName: replyToParentName, content: trimmedContent})
      .then(res => {
        if (res.status === "ok") {
          setReplyTo("");
          setReplyToOwner("");
          setReplyToParentOwner("");
          setReplyToParentName("");
          setReplyValue("");
          loadComments(page);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      })
      .finally(() => setReplySubmitting(false));
  };

  const deleteComment = comment => {
    Modal.confirm({
      title: i18next.t("general:Sure to delete?"),
      onOk: () => {
        CommentBackend.deleteComment(comment.owner, comment.name)
          .then(res => {
            if (res.status === "ok") {
              const deletingRootComment = comment.parentOwner === "" && comment.parentName === "";
              const nextPage = deletingRootComment && comments.length === 1 && page > 1 ? page - 1 : page;
              setPage(nextPage);
              loadComments(nextPage);
            } else {
              Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
            }
          })
          .catch(error => {
            Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${error}`);
          });
      },
    });
  };

  return (
    <Card
      title={
        <div style={{display: "flex", alignItems: "center", gap: 8}}>
          <CommentOutlined />
          <span>{i18next.t("general:Comments")}</span>
        </div>
      }
      styles={{body: {padding: "20px 24px"}}}
    >
      {disabled ? (
        <Empty description={unavailableText || i18next.t("store:Comments are unavailable")} />
      ) : (
        <div style={{display: "grid", gap: 18}}>
          {canComment ? renderEditor({
            value: content,
            onChange: setContent,
            onSubmit: submitComment,
            submitting,
            placeholder: i18next.t("store:Write a comment"),
          }) : (
            <Text type="secondary">{i18next.t("store:Sign in to comment")}</Text>
          )}
          <List
            loading={loading}
            dataSource={comments}
            locale={{emptyText: <Empty description={i18next.t("store:No comments yet")} />}}
            renderItem={comment => (
              <RootCommentItem
                key={getCommentId(comment)}
                account={account}
                comment={comment}
                targetOwner={targetOwner}
                replyTo={replyTo}
                replyValue={replyValue}
                replySubmitting={replySubmitting}
                replyToOwner={replyToOwner}
                onOpenReply={openReply}
                onChangeReply={setReplyValue}
                onSubmitReply={submitReply}
                onDelete={deleteComment}
              />
            )}
          />
          {total > pageSize ? (
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger={false}
              onChange={nextPage => {
                setPage(nextPage);
                loadComments(nextPage);
              }}
              style={{textAlign: "right"}}
            />
          ) : null}
        </div>
      )}
    </Card>
  );
}

export default CommentArea;
