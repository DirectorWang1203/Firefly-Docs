<script lang="ts">

    import {i18n} from "@i18n/translation.ts";
    import I18nKey from "@i18n/i18nKey.ts";

    type TLog = {
        role:string,
        content:string
    }

    let ready = $state(false);
    let message = $state("");
    let chatsId = $state("");
    let selected = $state("");
    let idArray = $derived(JSON.parse(chatsId));
    let log:TLog[] = $state([]);

    const runChat = async () => {
        if(message === '') {
            return;
        }
        log = [...log, {role: "user", content: message}];
        const tempMessage = message;
        message = "";

        const response = await fetch("/chats/run", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: tempMessage,
                chatsId: selected
            })
        })
        const data = await response.json();

        selected = data.chatId;
        log = [...log, {role: "assistant", content: data.chatMessage}];

        let tempIds:string|null|string[] = localStorage.getItem("chatId");
        if(tempIds) {
            tempIds = JSON.parse(tempIds) as string[];
            if((tempIds).includes(data.chatId)) {
                return;
            } else {
                tempIds.push(data.chatId);
                localStorage.setItem("chatId", JSON.stringify(tempIds));
            }
        } else {
            localStorage.setItem("chatId", JSON.stringify([data.chatId]));
        }

        console.log(data.chatMessage)

        chatsId = localStorage.getItem("chatId") || "[]";
    }

    const getHistory = async () => {
        const response = await fetch(`/chats/log?chatId=${selected}`);
        const data = await response.json();

        console.log(data);

        log = data.chatHistoryList.messages;
    }

    const pingChat = async () => {
        const response = await fetch("/chats/ping");
        const data = await response.json();

        console.log(data);

        if(data && data.reply === 'pang') {
            ready = true;
        }
    }

    $effect(() => {
        pingChat();
        chatsId = localStorage.getItem("chatId") || "[]";
    })

    $effect(() => {
        selected
        getHistory();
    })

    $effect(() => {
        log
        requestAnimationFrame(() => {
            const container = document.getElementById('chat-container');
            if (container) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        });
    })
</script>

{#if ready === true}
    <div class="flex w-full rounded-(--radius-large) overflow-hidden relative min-h-14">
        <div class="card-base z-10 px-4 py-3 relative w-full flex justify-between items-center">
            <button
                    popovertarget="popover-1"
                    style="anchor-name:--anchor-1"
                    class="btn-regular rounded-lg h-8 px-4 max-w-60 text-sm transition-colors"
                    aria-label={i18n(I18nKey.announcementClose)}
            >
                {selected === '' ? '新对话' : selected}
            </button>
            <div class="dropdown scrollbar scrollbar-thin scroll-smooth grid menu w-[300px] rounded-box bg-base-100 shadow-sm gap-2 mt-1 max-h-[200px]"
                 popover id="popover-1" style="position-anchor:--anchor-1">
                {#if selected === ''}
                    <li><a class="btn-regular cursor-default active:bg-(--btn-regular-bg) hover:bg-(--btn-regular-bg) text-(--btn-content)">新对话</a></li>
                {:else}
                    <li><a on:click={() => selected = ''} class="btn-regular bg-(--btn-regular-bg)/50 active:bg-(--btn-regular-bg-active)/60 hover:bg-(--btn-regular-bg-hover)/60 text-(--btn-content)/80">新对话</a></li>
                {/if}
                {#each idArray as item}
                    {#if selected === item}
                        <li><a class="btn-regular cursor-default active:bg-(--btn-regular-bg) hover:bg-(--btn-regular-bg) text-(--btn-content)">{item}</a></li>
                    {:else}
                        <li><a on:click={() => selected = item} class="btn-regular bg-(--btn-regular-bg)/50 active:bg-(--btn-regular-bg-active)/60 hover:bg-(--btn-regular-bg-hover)/60 text-(--btn-content)/80">{item}</a></li>
                    {/if}
                {/each}
            </div>
            <p class="text-75 select-none">
                流萤
            </p>
        </div>
    </div>
    <div class="flex w-full rounded-(--radius-large) relative mt-4 min-h-96">
        <div class="card-base flex flex-col gap-2 z-10 px-9 py-6 relative w-full">
            <div id="chat-container" class="overflow-auto scrollbar scrollbar-thin scroll-smooth rounded-xl border-2 border-solid border-(--btn-regular-bg) h-[60vh] p-2">
                {#each log as item}
                    {#if item.role === 'user'}
                        <div class="chat chat-end">
                            <div class="chat-bubble bg-(--btn-regular-bg-active) text-(--btn-content)">{item.content}</div>
                        </div>
                    {:else}
                        <div class="chat chat-start">
                            <div class="chat-bubble bg-(--btn-regular-bg) text-(--btn-content)">{item.content}</div>
                        </div>
                    {/if}
                {/each}
            </div>
            <div class="flex justify-center items-center gap-2 h-[40px]">
                <input bind:value={message} placeholder="请输入内容..." class="h-full px-4 w-3/4 rounded-md outline-none bg-(--btn-regular-bg) focus:bg-(--btn-regular-bg-active) hover:bg-(--btn-regular-bg-hover) text-(--btn-content) transition-colors" />
                <button on:click={() => runChat()} disabled="{message === ''}" class="{message === '' ? 'btn-regular cursor-not-allowed rounded-lg h-full px-4 max-w-60 text-sm bg-(--btn-regular-bg) focus:bg-(--btn-regular-bg) hover:bg-(--btn-regular-bg) transition-colors' : 'btn-regular rounded-lg h-full px-4 max-w-60 text-sm transition-colors'}">发送</button>
            </div>
        </div>
    </div>
{:else}
    <div class="flex w-full rounded-(--radius-large) overflow-hidden relative min-h-14">
        <div class="card-base z-10 px-4 py-3 relative w-full flex justify-center items-center text-75">
            少女祈祷中...
        </div>
    </div>
{/if}