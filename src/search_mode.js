/**
 * @file 探索モードの列挙型です。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

/**
 * 探索モードの列挙型です。
 */
export const SearchMode = {
    HARD: 0,
    NORMAL: 1,
    EASY: 2,
    fromString(str) {
        switch (str) {
            case 'normal':
            return this.NORNAL;
            case 'easy':
            return this.EASY;
            default:
            return this.HARD;
        }
    }
};
