/**
 * WebSocketまたはStdStreamを表すinterface
 */
interface Socket {
    onopen: ((event: Event) => any) | null;
    onerror: ((event: ErrorEvent) => any) | null;
    onmessage: ((event: MessageEvent) => any) | null;
    send(str: string): void;
}

export default Socket;
