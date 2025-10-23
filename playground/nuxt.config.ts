export default defineNuxtConfig({
    modules: ["../src/module"],
    devtools: { enabled: true },
    remoteCall: {
        function_paths: [
            "server/api/*",           // 匹配 server/api 下的所有 .ts 文件
            "server/utils/**",        // 递归匹配 server/utils 下的所有 .ts 文件
        ],
    },
});
