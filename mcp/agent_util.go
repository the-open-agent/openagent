package mcp

import (
	"errors"
	"strings"
)

// GetServerNameAndToolNameFromId splits tool IDs like "server__tool".
func GetServerNameAndToolNameFromId(id string) (string, string) {
	tokens := strings.Split(id, "__")

	if len(tokens) == 1 {
		return "", tokens[0]
	}

	if len(tokens) > 2 {
		panic(errors.New("GetServerNameAndToolNameFromName() error, wrong token count for ID: " + id))
	}

	return tokens[0], tokens[1]
}

// GetIdFromServerNameAndToolName combines server and tool names into an ID.
func GetIdFromServerNameAndToolName(serverName, toolName string) string {
	return serverName + "__" + toolName
}
