// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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

package model

import "strings"

// deepseek https://api-docs.deepseek.com/zh-cn/quick_start/pricing
// qwen     https://help.aliyun.com/zh/model-studio/models
// moonshot https://platform.moonshot.cn/docs/pricing/chat#%E7%94%9F%E6%88%90%E6%A8%A1%E5%9E%8B-moonshot-v1
// ernie    https://ai.baidu.com/ai-doc/WENXINWORKSHOP/Wm9cvy6rl
// cohere   https://docs.cohere.com/v2/docs/models#Command
// doubao   https://www.volcengine.com/docs/82379/1330310
// step     https://platform.stepfun.com/docs/llm/text
// Gemini   https://firebase.google.com/docs/vertex-ai/models
// hunyuan  https://cloud.tencent.com/document/product/1729/104753
// chatGLM  https://open.bigmodel.cn/pricing
// claude   https://docs.anthropic.com/zh-CN/docs/about-claude/models/overview

func getContextLength(typ string) int {
	typ = strings.ToLower(typ)
	if strings.Contains(typ, "deepseek") {
		if strings.Contains(typ, "distill") {
			if strings.Contains(typ, "qwen") {
				if strings.Contains(typ, "7b") {
					return 8192
				} else if strings.Contains(typ, "14b") || strings.Contains(typ, "32b") {
					return 32768
				}
				return 4096
			} else if strings.Contains(typ, "llama") {
				if strings.Contains(typ, "8b") {
					return 131072
				} else if strings.Contains(typ, "70b") {
					return 131072
				}
				return 4096
			}
			return 4096
		} else if strings.Contains(typ, "r1") {
			if strings.Contains(typ, "671b") {
				return 65536
			} else if strings.Contains(typ, "8b") || strings.Contains(typ, "70b") {
				return 131072
			} else if strings.Contains(typ, "7b") {
				return 8192
			} else if strings.Contains(typ, "14b") || strings.Contains(typ, "32b") {
				return 32768
			}
			return 65536
		} else if strings.Contains(typ, "v4") {
			return 1000000
		} else if strings.Contains(typ, "v2.5") {
			return 8192
		} else if strings.Contains(typ, "v3") || strings.Contains(typ, "chat") || strings.Contains(typ, "reasoner") {
			return 1000000
		}
	} else if strings.Contains(typ, "qwen") {
		if strings.Contains(typ, "long") || strings.Contains(typ, "turbo") {
			return 1000000
		} else if strings.Contains(typ, "plus") {
			return 131072
		} else if strings.Contains(typ, "max") {
			if strings.Contains(typ, "last") {
				return 131072
			}
			return 32768
		} else if strings.Contains(typ, "qwen2.5") {
			if strings.Contains(typ, "instruct") {
				if strings.Contains(typ, "72b") || strings.Contains(typ, "32b") || strings.Contains(typ, "14b") || strings.Contains(typ, "7b") {
					return 131072
				}
				return 4096
			}
			return 4096
		} else if strings.Contains(typ, "qwen3") {
			return 131072
		}
	} else if strings.Contains(typ, "doubao") {
		if strings.Contains(typ, "pro") {
			if strings.Contains(typ, "256k") {
				return 262144
			} else if strings.Contains(typ, "128k") {
				return 131072
			} else if strings.Contains(typ, "32k") {
				return 32768
			} else if strings.Contains(typ, "4k") {
				return 4096
			}
			return 4096
		} else if strings.Contains(typ, "lite") {
			if strings.Contains(typ, "128k") {
				return 131072
			} else if strings.Contains(typ, "32k") {
				return 32768
			} else if strings.Contains(typ, "4k") {
				return 4096
			}
			return 4096
		} else if strings.Contains(typ, "1.5") {
			if strings.Contains(typ, "256k") {
				return 262144
			} else if strings.Contains(typ, "32k") {
				return 32768
			}
			return 4096
		}
	} else if strings.Contains(typ, "gemini") {
		if strings.Contains(typ, "pro") {
			if strings.Contains(typ, "vision") || strings.Contains(typ, "vision") {
				return 1048576
			}
			return 1048576
		}
	} else if strings.Contains(typ, "claude") {
		if strings.Contains(typ, "4") {
			if strings.Contains(typ, "sonnet") {
				return 64000
			} else if strings.Contains(typ, "opus") {
				if strings.Contains(typ, "4-7") {
					return 1000000
				}
				return 32000
			}
		} else if strings.Contains(typ, "3-7") {
			if strings.Contains(typ, "sonnet") {
				return 64000
			}
		} else if strings.Contains(typ, "3-5") {
			if strings.Contains(typ, "sonnet") || strings.Contains(typ, "haiku") {
				return 8192
			}
		} else if strings.Contains(typ, "3") {
			if strings.Contains(typ, "haiku") || strings.Contains(typ, "opus") {
				return 4096
			} else if strings.Contains(typ, "sonnet") {
				return 4096
			}
		} else {
			return 4096
		}
	} else if strings.Contains(typ, "hunyuan") {
		if strings.Contains(typ, "lite") {
			return 262144
		} else if strings.Contains(typ, "standard") {
			if strings.Contains(typ, "256K") {
				return 262144
			}
			return 32768
		} else if strings.Contains(typ, "code") {
			return 8192
		} else if strings.Contains(typ, "role") {
			return 32768
		} else if strings.Contains(typ, "turbo") {
			return 32768
		} else {
			return 4096
		}
	} else if strings.Contains(typ, "step") {
		if strings.Contains(typ, "8k") || strings.Contains(typ, "flash") {
			return 8192
		} else if strings.Contains(typ, "16k") {
			return 16384
		} else if strings.Contains(typ, "32k") {
			return 32768
		} else if strings.Contains(typ, "128k") {
			return 131072
		} else if strings.Contains(typ, "256k") {
			return 262144
		} else {
			return 4096
		}
	} else if strings.Contains(typ, "gpt") || strings.HasPrefix(typ, "o") || strings.Contains(typ, "deep-research") {
		if strings.Contains(typ, "curie") {
			return 2048
		} else if strings.Contains(typ, "3.5") {
			if strings.Contains(typ, "turbo") {
				return 16385
			}
			return 2048
		} else if strings.Contains(typ, "o4") {
			return 100000
		} else if strings.Contains(typ, "o3") {
			return 100000
		} else if strings.Contains(typ, "o1") {
			return 128000
		} else if strings.Contains(typ, "deep-research") {
			return 200000
		} else if strings.Contains(typ, "5.5") {
			return 1050000
		} else if strings.Contains(typ, "5.2") || strings.Contains(typ, "5.1") || strings.Contains(typ, "5") {
			return 400000
		} else if strings.Contains(typ, "4.5") || strings.Contains(typ, "4o") {
			return 128000
		} else if strings.Contains(typ, "4.1") {
			return 100000
		} else if strings.Contains(typ, "4") {
			return 8192
		} else {
			return 2048
		}
	} else if strings.Contains(typ, "dummy") {
		return 4096
	} else if strings.Contains(typ, "Moonshot") {
		if strings.Contains(typ, "v1") {
			if strings.Contains(typ, "8k") {
				return 8192
			} else if strings.Contains(typ, "32k") {
				return 32768
			} else if strings.Contains(typ, "128k") {
				return 131072
			}
		}
		return 4096
	} else if strings.Contains(typ, "llama") {
		if strings.Contains(typ, "2") {
			return 4096
		} else if strings.Contains(typ, "3.1") {
			return 131072
		} else if strings.Contains(typ, "3.3") {
			if strings.Contains(typ, "70b") {
				return 131072
			}
		}
	} else if strings.Contains(typ, "ernie") {
		if strings.Contains(typ, "8k") {
			return 8192
		} else if strings.Contains(typ, "128k") {
			return 131072
		}
	} else if strings.Contains(typ, "spark") {
		if strings.Contains(typ, "pro-128k") || strings.Contains(typ, "128k") {
			return 131072
		} else if strings.Contains(typ, "x2") {
			return 65536
		} else if strings.Contains(typ, "x1.5") {
			return 65536
		} else if strings.Contains(typ, "4.0-ultra") || strings.Contains(typ, "max-32k") {
			return 32768
		} else if strings.Contains(typ, "max") || strings.Contains(typ, "pro") || strings.Contains(typ, "lite") {
			return 8192
		} else {
			return 8192
		}
	} else if strings.Contains(typ, "command") {
		if strings.Contains(typ, "r") || strings.Contains(typ, "r-plus") {
			return 131072
		} else if strings.Contains(typ, "light") {
			return 4096
		} else {
			return 4096
		}
	} else if strings.Contains(typ, "yi") {
		return 16384
	} else if strings.Contains(typ, "kimi") {
		return 131072
	} else if strings.Contains(typ, "glm") {
		if strings.Contains(typ, "3-turbo") {
			return 131072
		} else if strings.Contains(typ, "4V") {
			return 8192
		} else if strings.Contains(typ, "4") {
			return 131072
		}
	}
	return 4096
}
