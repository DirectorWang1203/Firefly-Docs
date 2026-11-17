<script lang="ts">

    type TLog = {
        role:string,
        content:string
    }

    // let ready = $state(false);
    // let message = $state("");
    // let chatsId = $state("");
    // let selected = $state("");
    // let log:TLog[] = $state([]);
    // let chatList:TChatList[] = $state([]);
    // let selectedTitle = $derived(chatList.find(item => item.chatId === selected)?.title);
</script>

<div class="flex w-full rounded-(--radius-large) overflow-hidden relative min-h-14">
    <div class="card-base z-10 px-4 py-3 relative w-full flex justify-center items-center text-75">
        少女祈祷中...
    </div>
</div>