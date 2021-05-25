import React from "react";
import { useIntl, IntlProvider, FormattedMessage } from "react-intl";
import Modal from 'react-modal';
import GoAI from "./GoAI";
import "./GoBoard.css";

const messages: { [locale: string]: any } = {
    "en": require("./locales/en.json"),
    "ja": require("./locales/ja.json"),
    "zh": require("./locales/zh.json"),
}

Modal.setAppElement("#app-container");

const App = () => {
    let locale = window.navigator.language.substring(0, 2);
    if (!["en", "ja", "zh"].includes(locale)) {
        locale = "en";
    }
    return (<IntlProvider locale={locale} messages={messages[locale]}>
        <_App />
    </IntlProvider>)
};

const _App = () => {
    const intl = useIntl(); // useIntlはIntlProviderの中でしか使えないので、App -> _Appと入れ子にしている
    let gtp = "katago";
    const customStyles = {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)'
        }
    };
    const [modalIsOpen, setIsOpen] = React.useState(true);
    const [sgf, setSgf] = React.useState("(;FF[4]GM[1]SZ[9]RU[japanese]KM[6.5])");

    function closeModal() {
        setIsOpen(false);
    }
    function handleChangeSize(event: React.ChangeEvent<HTMLInputElement>) {
        setSgf(`(;FF[4]GM[1]SZ[${event.currentTarget.value}]RU[japanese]KM[6.5])`);
    }

    if (window.location.search.startsWith("?")) {
        const assigns = window.location.search.substr(1).split("&");
        for (const assign of assigns) {
            const tokens = assign.split("=");
            if (tokens[0] === "gtp") {
                gtp = tokens[1];
            }
        }
    }

    const handleChangeSgf = (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.currentTarget;
        if (target.files == null || target.files.length === 0) {
                return;
        }
        const reader = new FileReader();
        reader.onload = async (event: Event) => {
                const target = event.target as any;
                setSgf(target.result);
        };
        reader.readAsText(target.files[0]);
    };

    const goAI = modalIsOpen ? (
        <Modal isOpen={modalIsOpen} style={customStyles}>
            <h2 style={{ textAlign: "center" }}><FormattedMessage id="appName" /> v1.1</h2>
            <form action="">
                <div style={{ textAlign: "center" }}>
                    <input type="radio" name="size" id="size1" value="9" checked onChange={handleChangeSize} />
                    <label htmlFor="size1">9</label>
                    <input type="radio" name="size" id="size2" value="13" onChange={handleChangeSize} />
                    <label htmlFor="size1">13</label>
                    <input type="radio" name="size" id="size3" value="19" onChange={handleChangeSize} />
                    <label htmlFor="size1">19</label>
                    <p><input type="file" name="sgf" onChange={handleChangeSgf} /></p>
                    <p><button type="button" onClick={closeModal}><FormattedMessage id="start" /></button></p>
                </div>
                <p><FormattedMessage id="notice" /></p>
                <p><FormattedMessage id="notice.content" /></p>
            </form>
        </Modal>
    ) : <GoAI gtp={gtp} sgf={sgf} intl={intl} />;

    return (
        <div>
            <h1 style={{ textAlign: "center" }}><FormattedMessage id="appName" /></h1>
            <p><FormattedMessage id="manual" /></p>
            {goAI}
            <p id="message"></p>
            <p>
            <FormattedMessage id="catchphrase" /> <a href={ intl.formatMessage({ id: "appIntroUrl" }) }><FormattedMessage id="iosAppName" /></a>
            <a href={ intl.formatMessage({ id: "appstoreUrl", defaultMessage: "https://itunes.apple.com/WebObjects/MZStore.woa/wa/viewSoftware?id=1442035374&mt=8" }) }><img src="./images/Download_on_the_App_Store_Badge_JP_RGB_blk_100317.svg" alt="Download on the App Store" /></a>
            </p>
        </div>
    )
};

export default App;
