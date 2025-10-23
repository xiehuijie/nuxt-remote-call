import { defineNuxtModule, addPlugin, createResolver, addImports, addTypeTemplate } from "@nuxt/kit";
import { readFile } from "fs/promises";
import { glob } from "tinyglobby";
import type * as ts from "typescript";

// Module options TypeScript interface definition
export interface ModuleOptions {
    /**
     * 用于存放远程调用函数的路径数组
     * 支持通配符,例如:['server/api/*', 'server/utils/**']
     */
    function_paths?: string[];
}

interface FunctionInfo {
    name: string;
    params: Array<{ name: string; type: string }>;
    returnType: string;
}

/**
 * 使用 glob 扫描指定模式的所有文件
 */
async function scanFiles(basePath: string, patterns: string[]): Promise<string[]> {
    // 将所有模式转换为 glob 模式，确保只匹配 .ts 和 .mts 文件
    const globPatterns = patterns.map((pattern) => {
        // 如果模式以 ** 结尾，添加 TypeScript 文件扩展名
        if (pattern.endsWith("**")) {
            return `${pattern}/*.{ts,mts}`;
        }
        // 如果模式以 * 结尾（但不是 **），添加 TypeScript 文件扩展名
        else if (pattern.endsWith("*") && !pattern.endsWith("**")) {
            return `${pattern}.{ts,mts}`;
        }
        // 如果模式以 / 结尾，递归匹配
        else if (pattern.endsWith("/")) {
            return `${pattern}**/*.{ts,mts}`;
        }
        // 如果没有扩展名，添加扩展名
        else if (!pattern.endsWith(".ts") && !pattern.endsWith(".mts")) {
            return `${pattern}.{ts,mts}`;
        }
        return pattern;
    });

    // 使用 tinyglobby 扫描文件
    const files = await glob(globPatterns, {
        cwd: basePath,
        absolute: true,
        onlyFiles: true,
        ignore: ["**/node_modules/**", "**/.nuxt/**", "**/dist/**", "**/.output/**"],
    });

    return files;
}

/**
 * 解析 TypeScript 文件，提取所有导出的函数及其类型信息
 */
async function parseFunctionsFromFile(filePath: string): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];

    try {
        // 动态导入 TypeScript
        const typescript = (await import("typescript").then((m) => m.default || m)) as typeof ts;

        const content = await readFile(filePath, "utf-8");
        const sourceFile = typescript.createSourceFile(filePath, content, typescript.ScriptTarget.Latest, true);

        function visit(node: ts.Node) {
            // 检查是否是导出的函数声明
            if (typescript.isFunctionDeclaration(node)) {
                const isExported = node.modifiers?.some((mod) => mod.kind === typescript.SyntaxKind.ExportKeyword);

                if (isExported && node.name) {
                    const functionName = node.name.getText(sourceFile);
                    const params = node.parameters.map((param) => {
                        const paramName = param.name.getText(sourceFile);
                        const paramType = param.type ? param.type.getText(sourceFile) : "any";
                        return { name: paramName, type: paramType };
                    });

                    const returnType = node.type ? node.type.getText(sourceFile) : "void";

                    functions.push({
                        name: functionName,
                        params,
                        returnType,
                    });
                }
            }

            typescript.forEachChild(node, visit);
        }

        visit(sourceFile);
    } catch (error) {
        console.error(`Error parsing file ${filePath}:`, error);
    }

    return functions;
}

/**
 * 将函数类型转换为异步类型
 */
function convertToAsyncType(func: FunctionInfo): string {
    const paramsStr = func.params.map((p) => `${p.name}: ${p.type}`).join(", ");

    // 如果返回类型已经是 Promise，则直接使用
    if (func.returnType.startsWith("Promise<")) {
        return `(${paramsStr}) => ${func.returnType}`;
    }

    // 否则包装成 Promise
    return `(${paramsStr}) => Promise<${func.returnType}>`;
}

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: "nuxt-remote-call",
        configKey: "remoteCall",
    },
    // Default configuration options of the Nuxt module
    defaults: {
        function_paths: [],
    },
    async setup(_options, _nuxt) {
        const resolver = createResolver(import.meta.url);

        addImports({ name: "useRemoteCall", from: resolver.resolve("./composables") });

        const paths = _options.function_paths || [];
        const allFunctions = new Map<string, FunctionInfo>();

        // 扫描所有配置的路径（一次性处理所有模式）
        if (paths.length > 0) {
            const files = await scanFiles(_nuxt.options.rootDir, paths);

            // 解析每个文件中的函数
            for (const file of files) {
                const functions = await parseFunctionsFromFile(file);
                for (const func of functions) {
                    // 使用函数名作为唯一标识符
                    if (allFunctions.has(func.name)) {
                        console.warn(`[nuxt-remote-call] Duplicate function name "${func.name}" found. The later one will be ignored.`);
                    } else {
                        allFunctions.set(func.name, func);
                    }
                }
            }
        }

        // 生成类型定义文件
        addTypeTemplate({
            filename: "types/remote-call.d.ts",
            getContents() {
                if (allFunctions.size === 0) {
                    return ["declare global {", "  type RemoteCallIds = never;", "  type RemoteCallFunctions = {};", "}", "export {};"].join("\n");
                }

                const functionIds = Array.from(allFunctions.keys())
                    .map((name) => `"${name}"`)
                    .join(" | ");

                const functionTypes = Array.from(allFunctions.entries())
                    .map(([name, func]) => {
                        const asyncType = convertToAsyncType(func);
                        return `    "${name}": ${asyncType};`;
                    })
                    .join("\n");

                return ["declare global {", `  type RemoteCallIds = ${functionIds};`, "  type RemoteCallFunctions = {", functionTypes, "  };", "}", "export {};"].join("\n");
            },
        });

        addPlugin(resolver.resolve("./runtime/plugin"));
    },
});
