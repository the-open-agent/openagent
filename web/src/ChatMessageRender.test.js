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

/* eslint-env jest */

import {renderLatex} from "./ChatMessageRender";

describe("renderLatex", () => {
  test("should render inline math with $...$", () => {
    const input = "The formula is $x^2 + y^2 = z^2$ and that's it.";
    const result = renderLatex(input);
    expect(result).toContain("katex");
    expect(result).not.toContain("$x^2");
  });

  test("should render display math with $$...$$", () => {
    const input = "The average is:\n$$\\frac{1 + 2 + 3 + 4 + 5}{5} = 3$$";
    const result = renderLatex(input);
    expect(result).toContain("katex-display");
    expect(result).not.toContain("$$");
  });

  test("should render inline math with \\(...\\)", () => {
    const input = "The sum \\(a + b = c\\) is simple.";
    const result = renderLatex(input);
    expect(result).toContain("katex");
    expect(result).not.toContain("\\(a");
  });

  test("should render display math with \\[...\\]", () => {
    const input = "The summation:\n\\[\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\\]";
    const result = renderLatex(input);
    expect(result).toContain("katex-display");
    expect(result).not.toContain("\\[\\sum");
  });

  test("should render multiple inline formulas", () => {
    const input = "We have $x = 1$, $y = 2$, and $z = 3$.";
    const result = renderLatex(input);
    const katexCount = (result.match(/katex/g) || []).length;
    expect(katexCount).toBeGreaterThanOrEqual(3);
  });

  test("should not process LaTeX inside code blocks", () => {
    const input = "```\n$x = 1$\n```";
    const result = renderLatex(input);
    expect(result).toContain("$x = 1$");
    expect(result).toContain("```");
  });

  test("should preserve non-LaTeX text", () => {
    const input = "This is plain text without any formulas.";
    const result = renderLatex(input);
    expect(result).toBe(input);
  });

  test("should handle mixed content", () => {
    const input = "Text before $x + y$ and $$z = \\frac{1}{2}$$ text after.";
    const result = renderLatex(input);
    expect(result).toContain("Text before");
    expect(result).toContain("text after");
    expect(result).toContain("katex");
  });

  test("should handle empty input", () => {
    const input = "";
    const result = renderLatex(input);
    expect(result).toBe("");
  });

  test("should handle invalid LaTeX gracefully", () => {
    const input = "$\\invalid{formula$";
    const result = renderLatex(input);
    // Should either render or preserve the original
    expect(result).toBeDefined();
  });
});
