// 장 목록. 새 장을 만들면 여기에 한 줄만 추가한다.
import { makeChapter1 } from './ch1.js';

export const CHAPTERS = [makeChapter1];
export const makeChapter = (n) => (CHAPTERS[n - 1] || CHAPTERS[0])();
