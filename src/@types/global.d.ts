import GoAI from "../GoAI";

declare global {
    interface Window {
        clipboardData?: any;
        goAI: GoAI;
        Module: any;
        katagoStatusHandler: (status: number) => void;
    }
}
