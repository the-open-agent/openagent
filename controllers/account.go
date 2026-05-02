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

package controllers

import (
	_ "embed"
	"fmt"
	"strings"
	"time"

	"github.com/beego/beego"
	"github.com/the-open-agent/openagent/auth"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

func init() {
	InitAuthConfig()
}

func tryInitAuthConfig() error {
	casdoorEndpoint := conf.GetConfigString("casdoorEndpoint")
	clientId := conf.GetConfigString("clientId")
	clientSecret := conf.GetConfigString("clientSecret")
	casdoorOrganization := conf.GetConfigString("casdoorOrganization")
	casdoorApplication := conf.GetConfigString("casdoorApplication")

	auth.InitConfig(casdoorEndpoint, clientId, clientSecret, "", casdoorOrganization, casdoorApplication)

	application, err := auth.GetApplication(casdoorApplication)
	if err != nil {
		return err
	}
	if application == nil {
		return fmt.Errorf("the application %q does not exist", casdoorApplication)
	}

	cert, err := auth.GetCert(application.Cert)
	if err != nil {
		return err
	}
	if cert == nil {
		return fmt.Errorf("the cert %q does not exist", application.Cert)
	}

	auth.InitConfig(casdoorEndpoint, clientId, clientSecret, cert.Certificate, casdoorOrganization, casdoorApplication)
	conf.SetCasdoorAvailable(true)
	return nil
}

func InitAuthConfig() {
	casdoorEndpoint := conf.GetConfigString("casdoorEndpoint")
	if casdoorEndpoint == "" {
		conf.SetCasdoorAvailable(false)
		return
	}

	if err := tryInitAuthConfig(); err != nil {
		conf.SetCasdoorAvailable(false)
		beego.Warning("InitAuthConfig: casdoor unreachable, will retry in background:", err)
		go func() {
			for {
				time.Sleep(10 * time.Second)
				if err := tryInitAuthConfig(); err != nil {
					conf.SetCasdoorAvailable(false)
					beego.Warning("InitAuthConfig: retry failed:", err)
				} else {
					beego.Info("InitAuthConfig: casdoor connected successfully")
					return
				}
			}
		}()
	}
}

// Signin
// @Title Signin
// @Tag Account API
// @Description sign in with Casdoor OAuth code or password
// @Param code  query string false "code of account"
// @Param state query string false "state of account"
// @Success 200 {casdoorsdk} auth.Claims The Response object
// @router /signin [post]
func (c *ApiController) Signin() {
	code := c.Input().Get("code")
	state := c.Input().Get("state")
	if code == "" && state == "" {
		c.signinWithPassword()
		return
	}

	token, err := auth.GetOAuthToken(code, state)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	claims, err := auth.ParseJwtToken(token.AccessToken)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if strings.Count(claims.Type, "-") <= 1 {
		if !util.IsAdmin(&claims.User) {
			claims.Type = "chat-user"
		}
	}

	err = c.addInitialChatAndMessage(&claims.User)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	claims.AccessToken = token.AccessToken
	c.SetSessionClaims(claims)
	userId := claims.User.Owner + "/" + claims.User.Name
	c.Ctx.Input.SetParam("recordUserId", userId)

	// Record session ID
	sessionId := c.Ctx.Input.CruSession.SessionID()
	if sessionId != "" && userId != "" {
		session := &object.Session{
			Owner:     claims.User.Owner,
			Name:      claims.User.Name,
			SessionId: []string{sessionId},
		}

		object.AddSession(session)
	}

	c.ResponseOk(claims)
}

// Signout
// @Title Signout
// @Tag Account API
// @Description sign out
// @Success 200 {object} controllers.Response The Response object
// @router /signout [post]
func (c *ApiController) Signout() {
	user := c.GetSessionUser()
	_, err := object.DeleteSessionId(util.GetIdFromOwnerAndName(user.Owner, user.Name), c.Ctx.Input.CruSession.SessionID())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.SetSessionClaims(nil)

	c.ResponseOk()
}

func (c *ApiController) addInitialChat(organization string, userName string, storeName string) (*object.Chat, error) {
	var store *object.Store
	var err error

	if storeName != "" {
		store, err = object.ResolveStoreByOwnerAndName("admin", storeName)
		if err != nil {
			return nil, err
		}
		if store == nil {
			return nil, fmt.Errorf(c.T("account:The store: %s is not found"), storeName)
		}
	} else {
		store, err = object.GetDefaultStore(c.defaultStoreOwner())
		if err != nil {
			return nil, err
		}
		if store == nil {
			return nil, nil
		}
	}

	currentTime := util.GetCurrentTime()
	chat := &object.Chat{
		Owner:         "admin",
		Name:          fmt.Sprintf("chat_%s", util.GetRandomName()),
		CreatedTime:   currentTime,
		UpdatedTime:   currentTime,
		Organization:  organization,
		DisplayName:   fmt.Sprintf("New Chat - %d", 1),
		Store:         store.Name,
		ModelProvider: store.ModelProvider,
		Category:      "Default Category",
		Type:          "AI",
		User:          userName,
		User1:         "",
		User2:         "",
		Users:         []string{},
		ClientIp:      c.getClientIp(),
		UserAgent:     c.getUserAgent(),
		MessageCount:  0,
		NeedTitle:     true,
	}

	if store.Welcome != "Hello" {
		chat.DisplayName = fmt.Sprintf("新会话 - %d", 1)
		chat.Category = "默认分类"
	}

	chat.ClientIpDesc = util.GetDescFromIP(chat.ClientIp)
	chat.UserAgentDesc = util.GetDescFromUserAgent(chat.UserAgent)

	_, err = object.AddChat(chat)
	if err != nil {
		return nil, err
	}

	return chat, nil
}

func (c *ApiController) addInitialChatAndMessage(user *auth.User) error {
	chats, err := object.GetChats("admin", "", user.Name)
	if err != nil {
		return err
	}

	if len(chats) != 0 {
		return nil
	}

	organizationName := user.Owner
	userName := user.Name

	chat, err := c.addInitialChat(organizationName, userName, "")
	if err != nil {
		return err
	}
	if chat == nil {
		return nil
	}

	store, err := object.ResolveStoreByOwnerAndName("admin", chat.Store)
	if err != nil {
		return err
	}
	if store == nil {
		return fmt.Errorf(c.T("account:The store: %s is not found"), chat.Store)
	}

	userMessage := &object.Message{
		Owner:        "admin",
		Name:         fmt.Sprintf("message_%s", util.GetRandomName()),
		CreatedTime:  util.AdjustTimeFromSecToMilli(chat.CreatedTime, -100),
		Organization: chat.Organization,
		Store:        chat.Store,
		User:         userName,
		Chat:         chat.Name,
		ReplyTo:      "",
		Author:       userName,
		Text:         store.Welcome,
		IsHidden:     true,
		VectorScores: []object.VectorScore{},
	}
	_, err = object.AddMessage(userMessage)
	if err != nil {
		return err
	}

	answerMessage := &object.Message{
		Owner:        "admin",
		Name:         fmt.Sprintf("message_%s", util.GetRandomName()),
		CreatedTime:  util.GetCurrentTimeEx(chat.CreatedTime),
		Organization: chat.Organization,
		Store:        chat.Store,
		User:         userName,
		Chat:         chat.Name,
		ReplyTo:      "Welcome",
		Author:       "AI",
		Text:         "",
		VectorScores: []object.VectorScore{},
	}
	_, err = object.AddMessage(answerMessage)
	return err
}

func (c *ApiController) anonymousSignin() {
	username := c.getAnonymousUsername()

	casdoorOrganization := conf.GetConfigString("casdoorOrganization")
	user := auth.User{
		Owner:           casdoorOrganization,
		Name:            username,
		CreatedTime:     util.GetCurrentTime(),
		Id:              username,
		Type:            "anonymous-user",
		DisplayName:     "User",
		Avatar:          "https://cdn.openagentai.org/img/user.png",
		AvatarType:      "",
		PermanentAvatar: "",
		Email:           "",
		EmailVerified:   false,
		Phone:           "",
		CountryCode:     "",
		Region:          "",
		Location:        "",
		Education:       "",
		IsAdmin:         false,
		CreatedIp:       "",
	}

	err := c.addInitialChatAndMessage(&user)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(user)
}

func (c *ApiController) getAnonymousUsername() string {
	clientIp := c.getClientIp()
	userAgent := c.getUserAgent()
	hash := getContentHash(fmt.Sprintf("%s|%s", clientIp, userAgent))
	return fmt.Sprintf("u-%s", hash)
}

func (c *ApiController) isPublicDomain() bool {
	configPublicDomain := conf.GetConfigString("publicDomain")
	if configPublicDomain == "" {
		return false
	}

	if strings.Contains(configPublicDomain, ",") {
		configPublicDomains := strings.Split(configPublicDomain, ",")
		for _, domain := range configPublicDomains {
			if c.Ctx.Request.Host == domain {
				return true
			}
		}
	} else {
		if c.Ctx.Request.Host == configPublicDomain {
			return true
		}
	}

	return false
}

func (c *ApiController) isSafePassword() (bool, error) {
	claims := c.GetSessionClaims()
	if claims == nil {
		return true, nil
	}

	if len(claims.User.Id) != 11 || !strings.HasPrefix(claims.User.Id, "270") {
		return true, nil
	}

	// Use the user data from claims which has been updated with fresh data from Casdoor in GetAccount()
	if claims.User.Password == "#NeedToModify#" {
		return false, nil
	} else {
		return true, nil
	}
}

// GetAccount
// @Title GetAccount
// @Tag Account API
// @Description get account
// @Success 200 {casdoorsdk} auth.Claims The Response object
// @router /get-account [get]
func (c *ApiController) GetAccount() {
	err := util.AppendWebConfigCookie(c.Ctx)
	if err != nil {
		fmt.Println(err)
	}

	if object.IsSigninEnabled() {
		if !c.isPublicDomain() {
			_, ok := c.RequireSignedIn()
			if !ok {
				return
			}
		} else {
			_, ok := c.CheckSignedIn()
			if !ok {
				c.anonymousSignin()
				return
			}
		}
	} else if !c.isPublicDomain() {
		_, ok := c.RequireSignedIn()
		if !ok {
			return
		}
	} else {
		_, ok := c.CheckSignedIn()
		if !ok {
			c.anonymousSignin()
			return
		}
	}

	claims := c.GetSessionClaims()

	// Fetch fresh user data from Casdoor in real-time for non-anonymous users
	if claims.User.Type != "anonymous-user" && claims.User.Owner != object.UserOwner {
		user, err := auth.GetUser(claims.User.Name)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		if user != nil {
			// Update the session with fresh user data from Casdoor
			// Only update the User field, preserving all other claims fields (AccessToken, Type, IsAdmin, etc.)
			claims.User = *user
			c.SetSessionClaims(claims)
		}
	}

	isSafePassword, err := c.isSafePassword()
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if !isSafePassword {
		claims.User.Password = "#NeedToModify#"
	}

	c.ResponseOk(claims)
}
