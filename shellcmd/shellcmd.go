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

// Package shellcmd extracts the executables a shell command line would run, so
// a permission layer can allow/deny by program name (git, rm, sudo, ...) rather
// than by fragile substring matching on the whole command. It is host-agnostic
// and reusable by any agent that exposes a shell tool.
//
// The parser targets POSIX shell syntax (sh/bash/zsh). It does NOT understand
// cmd.exe / PowerShell (%VAR% expansion, ^ escaping, batch "for %i ... do ...")
// — a caller on a non-POSIX shell MUST treat results as unknown, e.g. short-
// circuit to deny/ask by platform. The common %VAR% dynamic command form is
// reported certain=false, but full non-POSIX coverage is out of scope.
//
// The parser is deliberately conservative and errs toward surfacing MORE
// executables (command chaining, subshells, sudo/env wrappers, shell/eval -c
// bodies, find -exec, control keywords, path prefixes) so an allow/deny check
// that treats "any denied program" as a denial is hard to evade. For non-shell
// interpreters (python -c, node -e, perl -e, awk 'BEGIN{system()}') it surfaces
// the interpreter program itself but does NOT descend into its inline-script
// argument, so gating relies on the interpreter's own name (python, node, ...).
//
// When it cannot resolve a command to concrete program names — a dynamic "$CMD"
// or "%VAR%", an obfuscated command word — Executables returns certain=false so
// a caller can fail CLOSED instead of trusting a possibly-incomplete list; a
// security gate must never be evadable by making the parse fail. It is a
// security aid, not a full shell grammar; redirection *targets* (file writes)
// are out of scope — they are not executables and belong to a resource/path
// check at the caller.
package shellcmd

import "strings"

// wrappers run another program given as their argument; the wrapped program
// must also be surfaced (e.g. "sudo rm" -> [sudo, rm]).
var wrappers = map[string]bool{
	"sudo": true, "doas": true, "env": true, "nohup": true, "time": true,
	"nice": true, "ionice": true, "command": true, "builtin": true,
	"exec": true, "xargs": true, "watch": true, "timeout": true,
	"stdbuf": true, "setsid": true, "setarch": true,
}

// wrapperArgFlags lists, per wrapper, the short flags that consume the NEXT
// token as their value (so it is not mistaken for the wrapped program). Unknown
// flags are assumed valueless; GNU "--flag=value" needs no entry.
var wrapperArgFlags = map[string]map[string]bool{
	"sudo":    {"-u": true, "-g": true, "-h": true, "-p": true, "-C": true, "-r": true, "-t": true, "-T": true, "-U": true, "-R": true, "-c": true},
	"env":     {"-u": true, "-C": true, "-S": true},
	"nice":    {"-n": true},
	"ionice":  {"-c": true, "-n": true, "-p": true},
	"timeout": {"-s": true, "-k": true},
	"xargs":   {"-n": true, "-I": true, "-i": true, "-P": true, "-d": true, "-E": true, "-L": true, "-s": true, "-a": true},
	"watch":   {"-n": true, "-d": true},
	"stdbuf":  {"-i": true, "-o": true, "-e": true},
}

// wrapperPositional lists wrappers that take fixed positional args before the
// wrapped program (e.g. "timeout DURATION cmd").
var wrapperPositional = map[string]int{"timeout": 1}

// shells interpret a following -c argument as a nested command line.
var shells = map[string]bool{
	"sh": true, "bash": true, "zsh": true, "dash": true, "ash": true, "ksh": true,
}

// shellKeywords are reserved words that appear in command position but are not
// programs; the real command follows them (e.g. "then rm ..."). Skipping them
// surfaces the executable behind a control construct instead of the keyword.
var shellKeywords = map[string]bool{
	"if": true, "then": true, "elif": true, "else": true, "fi": true,
	"for": true, "while": true, "until": true, "do": true, "done": true,
	"case": true, "esac": true, "select": true, "function": true,
	"in": true, "!": true, "coproc": true,
}

// Executables returns the distinct program names a command line would invoke,
// normalized to their basename (so "/bin/rm" -> "rm"), preserving order.
//
// certain reports whether the command was fully understood. It is false when a
// program name cannot be resolved statically (a dynamic "$CMD", an obfuscated
// command word); a security check MUST treat certain==false as "unknown" and
// fail closed rather than trust the returned (possibly incomplete) list.
func Executables(command string) (exes []string, certain bool) {
	seen := map[string]bool{}
	certain = true
	add := func(name string) {
		if name == "" || seen[name] {
			return
		}
		seen[name] = true
		exes = append(exes, name)
	}
	for _, seg := range splitSegments(command) {
		segExes, segCertain := segmentExecutables(seg)
		if !segCertain {
			certain = false
		}
		for _, exe := range segExes {
			add(exe)
		}
	}
	return exes, certain
}

// splitSegments breaks a command line into command-position segments at shell
// control operators (; && || | & newline), subshells ( ) { }, and command
// substitution $(...) / backticks, while respecting single/double quotes.
func splitSegments(command string) []string {
	var segs []string
	var cur strings.Builder
	inSingle, inDouble := false, false
	flush := func() {
		if s := strings.TrimSpace(cur.String()); s != "" {
			segs = append(segs, s)
		}
		cur.Reset()
	}

	runes := []rune(command)
	for i := 0; i < len(runes); i++ {
		c := runes[i]
		switch {
		case inSingle:
			cur.WriteRune(c)
			if c == '\'' {
				inSingle = false
			}
		case inDouble:
			// Command substitution still executes inside double quotes.
			if c == '$' && i+1 < len(runes) && runes[i+1] == '(' {
				flush()
				i++
			} else if c == '`' {
				flush()
			} else {
				cur.WriteRune(c)
				if c == '"' {
					inDouble = false
				}
			}
		case c == '\'':
			inSingle = true
			cur.WriteRune(c)
		case c == '"':
			inDouble = true
			cur.WriteRune(c)
		case c == '&':
			// '&' (background) and '&&' (and) break a segment, but the '&' inside a
			// redirection (2>&1, >&2, &>file) does not — otherwise the redirect's
			// fd/target ("1" in "2>&1") becomes a spurious command. Keep it inline.
			if (i > 0 && runes[i-1] == '>') || (i+1 < len(runes) && runes[i+1] == '>') {
				cur.WriteRune(c)
			} else {
				flush()
			}
		case c == ';' || c == '\n' || c == '|' || c == '(' || c == ')' || c == '{' || c == '}' || c == '`':
			flush()
		case c == '$' && i+1 < len(runes) && runes[i+1] == '(':
			flush()
			i++
		default:
			cur.WriteRune(c)
		}
	}
	flush()
	return segs
}

// segmentExecutables returns the executables of a single segment and whether
// the parse is trustworthy: the leading program plus any programs it wraps
// (sudo/env/... chains, shell -c and eval bodies, find -exec). certain is false
// when the command name cannot be resolved statically (a dynamic $VAR or an
// obfuscated program word), so callers can fail closed.
func segmentExecutables(seg string) (exes []string, certain bool) {
	tokens := tokenize(seg)
	certain = true

	i := 0
	headerOnly := false
	for i < len(tokens) && (isEnvAssign(tokens[i]) || shellKeywords[tokens[i]]) {
		switch tokens[i] {
		case "for", "select", "case":
			// A loop/case header ("for x in ...") runs no command itself; any
			// command substitution in its word list is split into its own
			// segment, so this segment contributes no executable.
			headerOnly = true
		}
		i++
	}
	if headerOnly {
		return nil, true
	}

	for i < len(tokens) {
		tok := tokens[i]
		if isDynamic(tok) {
			// e.g. "$CMD ...": the program that runs depends on runtime state.
			return exes, false
		}
		exe := basename(tok)
		if exe == "" {
			break
		}
		exes = append(exes, exe)
		if strings.ContainsAny(exe, " \t") {
			// A program name with whitespace only arises from quoting or
			// backslash-escaping the command word — treat as obfuscation.
			certain = false
		}

		switch {
		case exe == "eval":
			// eval runs its concatenated arguments as a new command line.
			inner, innerCertain := Executables(strings.Join(tokens[i+1:], " "))
			exes = append(exes, inner...)
			return exes, certain && innerCertain
		case shells[exe]:
			body, hasC := shellDashCArg(tokens[i+1:])
			if hasC {
				inner, innerCertain := Executables(body)
				exes = append(exes, inner...)
				certain = certain && innerCertain
			} else {
				// No -c: the shell runs commands from a script file or from
				// stdin/a pipe (e.g. `echo rm -rf / | bash`), neither of which we
				// can inspect. Fail closed so the caller denies.
				certain = false
			}
			return exes, certain
		case exe == "find":
			inner, innerCertain := findExecPrograms(tokens[i+1:])
			exes = append(exes, inner...)
			return exes, certain && innerCertain
		case wrappers[exe]:
			// Advance past the wrapper's flags/args (and any positional args) to
			// the wrapped program, then continue.
			i = skipWrapperArgs(exe, tokens, i+1)
		default:
			return exes, certain
		}
	}
	return exes, certain
}

// isDynamic reports whether a command-position token embeds an unresolved
// expansion ($var, ${...}, or a Windows %VAR%) so its program name cannot be
// known statically. Command substitution $(...) and backticks are already split
// out upstream.
func isDynamic(token string) bool {
	return strings.ContainsAny(token, "$`%")
}

// findExecPrograms surfaces the programs a find(1) command runs via -exec /
// -execdir / -ok / -okdir. certain is false when such a program is dynamic.
func findExecPrograms(tokens []string) (exes []string, certain bool) {
	certain = true
	for i := 0; i < len(tokens); i++ {
		switch tokens[i] {
		case "-exec", "-execdir", "-ok", "-okdir":
			if i+1 >= len(tokens) {
				continue
			}
			prog := tokens[i+1]
			if isDynamic(prog) {
				certain = false
				continue
			}
			if b := basename(prog); b != "" {
				exes = append(exes, b)
			}
		}
	}
	return exes, certain
}

// skipWrapperArgs returns the index of the wrapped program's token, skipping a
// wrapper's flags, flag values, env assignments and fixed positional args.
func skipWrapperArgs(wrapper string, tokens []string, i int) int {
	argFlags := wrapperArgFlags[wrapper]
	for i < len(tokens) {
		tok := tokens[i]
		if isEnvAssign(tok) {
			i++
			continue
		}
		if strings.HasPrefix(tok, "-") {
			i++
			if argFlags[tok] && i < len(tokens) {
				i++ // this flag consumes its value
			}
			continue
		}
		break
	}
	for n := wrapperPositional[wrapper]; n > 0 && i < len(tokens); n-- {
		i++
	}
	return i
}

// shellDashCArg finds a shell's -c command body among its argument tokens. It
// handles combined short-flag clusters where c is last (-ec, -lc, -xc → the body
// is the next token) and inline forms (-c'cmd', -ccmd → the body is the token
// remainder). hasC reports whether a -c option was present at all; when false the
// shell runs a script file or stdin, which the caller cannot inspect.
func shellDashCArg(tokens []string) (body string, hasC bool) {
	for i, t := range tokens {
		if len(t) < 2 || t[0] != '-' || t[1] == '-' {
			continue // not a short-flag cluster
		}
		idx := strings.IndexByte(t, 'c')
		if idx < 1 {
			continue // no -c option in this cluster
		}
		if idx+1 < len(t) {
			return unquote(t[idx+1:]), true // inline arg: -ccmd / -xc'cmd'
		}
		if i+1 < len(tokens) {
			return unquote(tokens[i+1]), true // c is last: body is the next token
		}
		return "", true // -c with nothing after it
	}
	return "", false
}

// tokenize splits a segment on whitespace while keeping quoted spans together;
// each returned token has its surrounding quotes stripped.
func tokenize(seg string) []string {
	var tokens []string
	var cur strings.Builder
	inSingle, inDouble, has := false, false, false
	flush := func() {
		if has {
			tokens = append(tokens, cur.String())
		}
		cur.Reset()
		has = false
	}
	runes := []rune(seg)
	for i := 0; i < len(runes); i++ {
		c := runes[i]
		switch {
		case inSingle:
			// Backslash is literal inside single quotes (POSIX).
			if c == '\'' {
				inSingle = false
			} else {
				cur.WriteRune(c)
			}
			has = true
		case inDouble:
			if c == '\\' && i+1 < len(runes) {
				i++
				cur.WriteRune(runes[i])
			} else if c == '"' {
				inDouble = false
			} else {
				cur.WriteRune(c)
			}
			has = true
		case c == '\\':
			// Escape: the next char is literal, the backslash is dropped, so
			// "r\m" -> "rm" and "sudo\ rm" -> the single word "sudo rm".
			if i+1 < len(runes) {
				i++
				cur.WriteRune(runes[i])
			}
			has = true
		case c == '\'':
			inSingle = true
			has = true
		case c == '"':
			inDouble = true
			has = true
		case c == ' ' || c == '\t':
			flush()
		default:
			cur.WriteRune(c)
			has = true
		}
	}
	flush()
	return tokens
}

func isEnvAssign(token string) bool {
	eq := strings.IndexByte(token, '=')
	if eq <= 0 {
		return false
	}
	for i, r := range token[:eq] {
		if r == '_' || (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			continue
		}
		if i > 0 && r >= '0' && r <= '9' {
			continue
		}
		return false
	}
	return true
}

// basename strips quotes and any directory prefix from an executable token.
func basename(token string) string {
	t := unquote(token)
	if t == "" {
		return ""
	}
	if idx := strings.LastIndexAny(t, "/\\"); idx >= 0 {
		t = t[idx+1:]
	}
	return t
}

func unquote(token string) string {
	return strings.Trim(token, "'\"")
}
