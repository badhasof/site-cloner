/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
            "color_313131": "#313131",
            "color_222": "#222",
            "color_d9d9d9": "#d9d9d9",
            "rgb_0_0_0": "rgba(0,0,0,0)",
            "color_0051c3": "#0051c3",
            "rgb_49_49_49": "rgb(49,49,49)",
            "rgb_0_81_195": "rgb(0,81,195)",
            "color_fff": "#fff",
            "color_b20f03": "#b20f03",
            "color_ee730a": "#ee730a",
            "color_313131 rgba(0,0,0,0) rgba(0,0,0,0)": "#313131 rgba(0,0,0,0) rgba(0,0,0,0)",
            "color_4693ff": "#4693ff",
            "color_1d1d1d": "#1d1d1d",
            "color_999 rgba(0,0,0,0) rgba(0,0,0,0)": "#999 rgba(0,0,0,0) rgba(0,0,0,0)",
            "color_003681": "#003681",
            "color_fc574a": "#fc574a",
            "color_595959 rgba(0,0,0,0) rgba(0,0,0,0)": "#595959 rgba(0,0,0,0) rgba(0,0,0,0)"
      },
      "fontFamily": {
            "-apple-system": [
                  "-apple-system"
            ],
            "blinkmacsystemfont": [
                  "BlinkMacSystemFont"
            ],
            "segoe-ui": [
                  "Segoe UI"
            ],
            "roboto": [
                  "Roboto"
            ],
            "helvetica-neue": [
                  "Helvetica Neue"
            ],
            "arial": [
                  "Arial"
            ],
            "noto-sans": [
                  "Noto Sans"
            ],
            "apple-color-emoji": [
                  "Apple Color Emoji"
            ],
            "segoe-ui-emoji": [
                  "Segoe UI Emoji"
            ],
            "segoe-ui-symbol": [
                  "Segoe UI Symbol"
            ],
            "noto-color-emoji": [
                  "Noto Color Emoji"
            ],
            "monaco": [
                  "monaco"
            ],
            "courier": [
                  "courier"
            ]
      },
      "spacing": {
            "spacing_34": "34px",
            "spacing_42": "42px"
      },
      "borderRadius": {
            "radius__313rem": ".313rem"
      },
      "keyframes": {
            "lds-ring": {
                  "0%": {
                        "transform": "rotate(0deg)"
                  },
                  "100%": {
                        "transform": "rotate(360deg)"
                  }
            }
      },
      "animation": {
            "lds-ring": "lds-ring 1.2s ease infinite"
      }
},
  },
  plugins: [],
}
