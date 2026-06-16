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

package util

import (
	"image/color"
	"math"
)

func mixChannel(a uint8, b uint8, t float64) uint8 {
	i := (1-t)*float64(a)*float64(a) + t*float64(b)*float64(b)
	return uint8(math.Sqrt(i))
}

func MixColor(c1 color.RGBA, c2 color.RGBA, t float64) color.RGBA {
	res := color.RGBA{
		R: mixChannel(c1.R, c2.R, t),
		G: mixChannel(c1.G, c2.G, t),
		B: mixChannel(c1.B, c2.B, t),
		// Alpha is linear (not gamma-encoded), so blend it linearly. Without
		// setting A the result defaulted to 0, making every mixed color fully
		// transparent.
		A: uint8(math.Round((1-t)*float64(c1.A) + t*float64(c2.A))),
	}
	return res
}
