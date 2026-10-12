// 장 목록. 새 장을 만들면 여기에 한 줄만 추가한다.
import { makeChapter1 } from './ch1.js';
import { makeChapter2 } from './ch2.js';
import { makeChapter3 } from './ch3.js';
import { makeChapter4 } from './ch4.js';
import { makeChapter5 } from './ch5.js';

export const CHAPTERS = [makeChapter1, makeChapter2, makeChapter3, makeChapter4, makeChapter5];
export const CHAPTER_NAMES = ['오로라 다리', '방울의 바다', '메아리의 탑', '어둠의 물길', '두 개의 달'];
export const makeChapter = (n) => (CHAPTERS[n - 1] || CHAPTERS[0])();
