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

package shellcmd

import (
	"reflect"
	"testing"
)

func TestExecutables(t *testing.T) {
	cases := []struct {
		name        string
		cmd         string
		want        []string
		wantCertain bool
	}{
		{"simple", "git status", []string{"git"}, true},
		{"empty", "   ", nil, true},
		{"rm", "rm -rf /", []string{"rm"}, true},
		{"semicolon chain", "ls; rm -rf /", []string{"ls", "rm"}, true},
		{"and chain", "ls && rm -rf /", []string{"ls", "rm"}, true},
		{"or chain", "false || rm x", []string{"false", "rm"}, true},
		{"pipe", "cat a | grep b | rm", []string{"cat", "grep", "rm"}, true},
		{"sudo wrapper", "sudo rm -rf /", []string{"sudo", "rm"}, true},
		{"sudo with flags", "sudo -u root rm x", []string{"sudo", "rm"}, true},
		{"env wrapper", "FOO=bar rm x", []string{"rm"}, true},
		{"env command", "env A=B rm x", []string{"env", "rm"}, true},
		{"path prefix", "/bin/rm -rf /", []string{"rm"}, true},
		{"backslash path", "\\rm -rf", []string{"rm"}, true},
		{"quoted arg not a command", "git commit -m 'rm this now'", []string{"git"}, true},
		{"double quoted arg", "git commit -m \"please rm it\"", []string{"git"}, true},
		{"command substitution", "echo $(rm -rf /)", []string{"echo", "rm"}, true},
		{"backtick substitution", "echo `rm -rf /`", []string{"echo", "rm"}, true},
		{"subshell parens", "(cd /tmp && rm x)", []string{"cd", "rm"}, true},
		{"bash -c", "bash -c \"rm -rf /\"", []string{"bash", "rm"}, true},
		{"sh -c chain", "sh -c 'ls; sudo reboot'", []string{"sh", "ls", "sudo", "reboot"}, true},
		{"dedup", "rm a; rm b", []string{"rm"}, true},
		{"xargs wrapper", "find . | xargs rm", []string{"find", "xargs", "rm"}, true},

		// fail-closed hardening: constructs that previously smuggled a program past
		// the parser must now surface it or report certain=false so callers deny.
		{"if/then keyword", "if true; then rm -rf /; fi", []string{"true", "rm"}, true},
		{"for/do keyword", "for i in 1 2; do rm -rf /; done", []string{"rm"}, true},
		{"while condition runs", "while rm lock; do sleep 1; done", []string{"rm", "sleep"}, true},
		{"negation keyword", "! rm -rf /", []string{"rm"}, true},
		{"eval body", "eval 'rm -rf /'", []string{"eval", "rm"}, true},
		{"find exec", "find . -exec rm {} ;", []string{"find", "rm"}, true},
		{"backslash mid-word", "r\\m -rf /", []string{"rm"}, true},
		{"redirect target ignored", "echo pwned > /etc/passwd", []string{"echo"}, true},
		{"dynamic command word", "X=rm; $X -rf /", nil, false},
		{"dynamic wrapped program", "sudo $X", []string{"sudo"}, false},
		{"escaped-space obfuscation", "sudo\\ rm x", []string{"sudo rm"}, false},

		// combined shell flag clusters must still surface the -c body (F3)
		{"combined flag -ec", "bash -ec 'rm -rf /'", []string{"bash", "rm"}, true},
		{"combined flag -lc", "sh -lc 'rm x'", []string{"sh", "rm"}, true},
		{"inline -c body", "bash -c'rm x'", []string{"bash", "rm"}, true},
		// a shell fed from stdin/pipe or a script file can't be inspected (F4)
		{"piped into shell", "echo 'rm -rf /' | bash", []string{"echo", "bash"}, false},
		{"shell runs script file", "bash deploy.sh", []string{"bash"}, false},
		{"shell reads stdin -s", "sh -s", []string{"sh"}, false},

		// redirections must not be split into spurious commands (A)
		{"redirect 2>&1", "ls -la 2>&1", []string{"ls"}, true},
		{"redirect 2>&1 then pipe", "go build ./... 2>&1 | head", []string{"go", "head"}, true},
		{"redirect &> file", "make &> out.log", []string{"make"}, true},
		{"redirect >&2", "echo err >&2", []string{"echo"}, true},
		// background/and still split
		{"background amp", "sleep 1 & echo done", []string{"sleep", "echo"}, true},
		// Windows %VAR% command word can't be resolved by the POSIX parser (B)
		{"windows comspec dynamic", "%COMSPEC% /c del /s /q C:", nil, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, certain := Executables(tc.cmd)
			if certain != tc.wantCertain {
				t.Errorf("Executables(%q) certain = %v, want %v", tc.cmd, certain, tc.wantCertain)
			}
			if len(got) == 0 && len(tc.want) == 0 {
				return
			}
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("Executables(%q) = %v, want %v", tc.cmd, got, tc.want)
			}
		})
	}
}
