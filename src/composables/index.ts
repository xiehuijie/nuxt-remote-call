export function useRemoteCall<Id extends RemoteCallIds>(id: Id): RemoteCallFunctions[Id] {
    // 这里返回一个代理函数，实际调用会通过 API 请求到服务端执行
    return (async (...args: any[]) => {
        // TODO: 实现实际的远程调用逻辑
        console.log(`Remote call to ${id} with args:`, args);
        throw new Error(`Remote call not implemented yet for function: ${id}`);
    }) as any;
}
