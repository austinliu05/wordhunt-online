import React, { useEffect, useState, useRef } from 'react';
import { Row, Col } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { EASY_DELAY, MEDIUM_DELAY, SCORING, TIMER_LENGTH } from '../../utils/constants';
import { useGameContext } from '../../context/gameContext';
import { useWordContext } from '../../context/wordContext';
import { validateWord } from '../../utils/validateWord';
import TrackingSelectedTiles from './trackingSelectedTiles';
import './gameBoard.css';

interface Tile {
  row: number;
  col: number;
  letter: string;
  x: number;
  y: number;
}

const CPUOpponentPlayerBoard: React.FC = () => {
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [words, setWords] = useState<{ [key: string]: any }>({});
  const [currentWord, setCurrentWord] = useState<string>('');
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [isValidWord, setIsValidWord] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>();
  const location = useLocation();
  const requestInProgress = useRef(false);
  const isComponentActive = useRef(true);
  let cpuDelay = EASY_DELAY;

  const {
    board,
    difficulty,
    isGameOver,
    isGameStarted,
    updateOpponentScore,

  } = useGameContext();
  const { trackCPUWords } = useWordContext();

  useEffect(() => {
    isComponentActive.current = location.pathname === '/game';
    return () => {
      isComponentActive.current = false;
    };
  }, [location]);

  useEffect(() => {
    if (board && difficulty) {
      requestMoves({ board, difficulty });
    }
  }, [board, difficulty]);

  useEffect(() => {
    if (words && Object.keys(words).length > 0 && isGameStarted && !isGameOver) {
      if (difficulty === 'easy') {
        cpuDelay = EASY_DELAY;
      } else if (difficulty === 'medium') {
        cpuDelay = MEDIUM_DELAY;
      }
      simulatePlayerMoves();
    }
  }, [words]);

  const requestMoves = async (payload: { board: string[][]; difficulty: string }) => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    try {
      let apiUrl = process.env.REACT_APP_BACKEND_URL;
      // DEV purposes only
      apiUrl = 'http://localhost:3000/';
      const response = await fetch(`${apiUrl}api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      console.log('Response from backend:', data.paths);
      setWords(data.paths);
    } catch (error) {
      console.error('Error making request: ', error);
    }
  };

  const getTileCoordinates = (tileElement: HTMLElement) => {
    const containerRect = boardContainerRef.current?.getBoundingClientRect();
    const tileRect = tileElement.getBoundingClientRect();

    return {
      x: tileRect.left - (containerRect?.left || 0) + tileRect.width / 2,
      y: tileRect.top - (containerRect?.top || 0) + tileRect.height / 2,
    };
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomDelay = () => Math.floor(Math.random() * ((cpuDelay + 500) - cpuDelay + 1)) + cpuDelay;

  const randomizeMoves = () => {
    const entries = Object.entries(words);

    // Shuffle the entries array using the Fisher-Yates algorithm
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); 
      [entries[i], entries[j]] = [entries[j], entries[i]]; 
    }
    return entries;
  }
  const simulatePlayerMoves = async () => {
    let usedWords: string[] = [];
    let isTimeExpired = false;

    const timer = setTimeout(() => {
      isTimeExpired = true;
    }, TIMER_LENGTH * 1000);

    for (const [word, indices] of randomizeMoves()) {
      if (isTimeExpired || !isComponentActive.current) {
        console.log("Time expired")
        return;
      }
      let localCurrentWord = '';
      let isValid = false;
      setCurrentWord('');
      setSelectedTiles([]);
      setSelectedColor('');

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        localCurrentWord += char;
        setCurrentWord(localCurrentWord);

        const [row, col] = indices[i];
        const tileElement = document.getElementById(`cpu-tile-${row}-${col}`);
        if (tileElement) {
          const { x, y } = getTileCoordinates(tileElement);
          const newTile = { row, col, letter: board[row][col], x, y };
          setSelectedTiles((prev) => [...prev, newTile]);
        }

        isValid = await validateWord(localCurrentWord);
        setIsValidWord(isValid);
        const isUsed = usedWords.includes(localCurrentWord);

        if (isValid && localCurrentWord.length > 2) {
          const color = isUsed ? 'yellow' : 'green';
          setSelectedColor(color);
          await delay(500);
        } else {
          setSelectedColor(null);
        }
        await delay(randomDelay());
        if (isTimeExpired || !isComponentActive.current) {
          return;
        }
      }
      usedWords.push(localCurrentWord);
      setUsedWords(usedWords);
      trackCPUWords(usedWords);
      setSelectedTiles([]);
      setSelectedColor('');
      await checkWordValue(localCurrentWord, isTimeExpired, isValid);
    }
    console.log("Used up all the words!")
  };

  const checkWordValue = async (word: string, isTimeExpired: boolean, isValid: boolean) => {
    if (word.length > 2 && !usedWords.includes(word) && !isTimeExpired && isValid) {
      const points = SCORING[word.length] || 0;
      console.log(`Adding ${points} points for word: ${word}`);
      updateOpponentScore(points);
    }
  };

  const isTileSelected = (row: number, col: number): boolean =>
    selectedTiles.some((tile) => tile.row === row && tile.col === col);

  return (
    <div
      className="d-flex flex-column justify-content-center mt-4 m-3"
    >
      <TrackingSelectedTiles selectedTiles={selectedTiles} usedWords={usedWords} selectedColor={selectedColor || 'white'} isValidWord={isValidWord} />
      <div
        className="board-container position-relative cpu-board"
        ref={boardContainerRef}
      >
        <svg className="line-layer position-absolute w-100 h-100">
          {selectedTiles.map((tile, index) => {
            if (index === 0) return null;
            const prevTile = selectedTiles[index - 1];
            const lineColor = selectedColor === "green" || selectedColor === "yellow" ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 0, 0, 0.4)";

            return (
              <line
                key={index}
                x1={prevTile.x}
                y1={prevTile.y}
                x2={tile.x}
                y2={tile.y}
                stroke={lineColor}
                strokeWidth="6"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        {board.map((row, rowIndex) => (
          <Row key={rowIndex} className="mx-0 mb-2">
            {row.map((letter, colIndex) => {
              const isSelected = isTileSelected(rowIndex, colIndex);
              const tileColorClass = isSelected
                ? selectedColor === "green"
                  ? "selected-green"
                  : selectedColor === "yellow"
                    ? "selected-yellow"
                    : "selected"
                : "";

              return (
                <Col
                  key={colIndex}
                  id={`cpu-tile-${rowIndex}-${colIndex}`}
                  className={`border p-3 text-center mx-1 ${tileColorClass}`}
                >
                  <h3>{letter}</h3>
                </Col>
              );
            })}
          </Row>
        ))}
      </div>

      <div className="d-flex justify-content-center m-4">
        <h1>Opponent</h1>
      </div>
    </div>
  );
};

export default CPUOpponentPlayerBoard;
