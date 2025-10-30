type User = keyof HuggingFaceRecommendedModels;

export type ModelIdentifier =
    | {
          [U in User]: `hf:${U}/${HuggingFaceRecommendedModels[U][number]}`;
      }[User]
    | (string & {});

export type HuggingFaceRecommendedModels = {
    readonly unsloth: readonly [
        /**
         * F16 - Full 16-bit floating point precision. Highest quality, largest size (13.8 GB).
         * Use for maximum accuracy when disk space and memory are not concerns.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-F16.gguf",
        /**
         * Q2_K - 2-bit quantization with K-quant method. Smallest size, lowest quality (11.5 GB).
         * Use when extreme compression is needed and quality loss is acceptable.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q2_K.gguf",
        /**
         * Q2_K_L - 2-bit quantization with K-quant method (Large variant). Slightly better than Q2_K (11.8 GB).
         * Use for better quality than Q2_K while maintaining very small size.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q2_K_L.gguf",
        /**
         * Q3_K_M - 3-bit quantization with K-quant method (Medium variant). Balanced 3-bit option (11.5 GB).
         * Use for a good balance between size and quality at 3-bit precision.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q3_K_M.gguf",
        /**
         * Q3_K_S - 3-bit quantization with K-quant method (Small variant). Smaller than Q3_K_M (11.5 GB).
         * Use when you need slightly smaller size than Q3_K_M with minimal quality difference.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q3_K_S.gguf",
        /**
         * Q4_0 - 4-bit quantization (legacy method). Original 4-bit quantization (11.5 GB).
         * Use for compatibility with older systems or when legacy format is required.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q4_0.gguf",
        /**
         * Q4_1 - 4-bit quantization (legacy method, improved). Better than Q4_0 (11.6 GB).
         * Use for improved quality over Q4_0 in legacy format.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q4_1.gguf",
        /**
         * Q4_K_M - 4-bit quantization with K-quant method (Medium variant). Recommended 4-bit option (11.6 GB).
         * Use as the default choice for most applications - good balance of quality and size.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q4_K_M.gguf",
        /**
         * Q4_K_S - 4-bit quantization with K-quant method (Small variant). Smaller than Q4_K_M (11.6 GB).
         * Use when you need smaller size than Q4_K_M with slightly reduced quality.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q4_K_S.gguf",
        /**
         * Q5_K_M - 5-bit quantization with K-quant method (Medium variant). Higher quality 5-bit option (11.7 GB).
         * Use when you need better quality than 4-bit with acceptable size increase.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q5_K_M.gguf",
        /**
         * Q5_K_S - 5-bit quantization with K-quant method (Small variant). Smaller than Q5_K_M (11.7 GB).
         * Use for smaller size than Q5_K_M while maintaining 5-bit precision.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q5_K_S.gguf",
        /**
         * Q6_K - 6-bit quantization with K-quant method. Very high quality, larger size (12 GB).
         * Use when you need near-original quality with moderate compression.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q6_K.gguf",
        /**
         * Q8_0 - 8-bit quantization. Excellent quality, minimal loss from original (12.1 GB).
         * Use when you want maximum quality with some compression (close to F16).
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-Q8_0.gguf",
        /**
         * UD-Q4_K_XL - Ultra-Dense 4-bit quantization (XL variant). Advanced compression technique (11.9 GB).
         * Use for experimental ultra-dense 4-bit compression with enhanced quality.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-UD-Q4_K_XL.gguf",
        /**
         * UD-Q6_K_XL - Ultra-Dense 6-bit quantization (XL variant). Advanced compression technique (12 GB).
         * Use for experimental ultra-dense 6-bit compression with high quality.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-UD-Q6_K_XL.gguf",
        /**
         * UD-Q8_K_XL - Ultra-Dense 8-bit quantization (XL variant). Advanced compression technique (13.2 GB).
         * Use for experimental ultra-dense 8-bit compression with excellent quality.
         */
        "gpt-oss-20b-GGUF/gpt-oss-20b-UD-Q8_K_XL.gguf"
    ];
};
