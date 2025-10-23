<template>
    <div>
        <h1>Nuxt Remote Call Playground</h1>
        <button @click="testRemoteCall">Test Remote Call</button>
        <div v-if="result">Result: {{ result }}</div>
    </div>
</template>

<script setup lang="ts">
const result = ref<any>(null);

// 测试类型提示和函数调用
const callAdd = useRemoteCall("add");
const callGetUser = useRemoteCall("getUser");
const callFetchUser = useRemoteCall("fetchUser");

async function testRemoteCall() {
    try {
        // 这些调用现在都有完整的类型提示
        const sum = await callAdd(3, 4); // TypeScript 知道这返回 Promise<number>
        const user = await callGetUser(1); // TypeScript 知道这返回 Promise<{ id: number; name: string; email: string }>
        const fetchedUser = await callFetchUser("user123"); // TypeScript 知道这返回 Promise<{ id: string; name: string }>

        result.value = { sum, user, fetchedUser };
    } catch (error) {
        console.error("Remote call error:", error);
        result.value = { error: (error as Error).message };
    }
}
</script>
