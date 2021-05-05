export function updateMessage(str: string, color: string = "black") {
    const dom = document.getElementById("message")!;
    dom.innerText = str;
    dom.style.color = color;
}

export function addMessage(str: string) {
    const dom = document.getElementById("message")!;
    dom.innerText += "\n" + str;
}

export function isTouchDevice() {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
}