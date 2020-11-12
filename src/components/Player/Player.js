import React, { useState, useEffect, useRef, useContext } from 'react';
import useInterval from '@use-it/interval';
import './Player.css';
import classNames from 'classnames';
import PlayerMenu from './PlayerMenu';
import Visualization from '../Visualization/Visualization';
window.AudioContext = window.AudioContext || window.webkitAudioContext;
import PlayerClipButton from './PlayerClipButton';
import { ContextSongsData } from '../../contexts/ContextSongsData';

const Player = () => {
  const songsList = useContext(ContextSongsData);

  const [isSongPlay, setSongPlay] = useState(false);
  const [songTime, setSongTime] = useState('');
  const [currentSongTime, setCurrentSongTime] = useState(0);
  const [styleSeekerCover, setSeekerCover] = useState('0%');
  const [isSongListOpen, setSongListOpen] = useState(false);
  const [lyricSongsToggle, changeLyricSongs] = useState(false);
  const [audioCtx, setAudioCtx] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [durationTime, setDurationTime] = useState(0);

  const templateAreas = {
    open: `"album control-box control-box control-box"
  "album . relise-box ."`,
    close: `"control-box control-box control-box control-box"
  "album . relise-box ."`,
  };

  // Начальное состояние - заглавная песня на странице, первая песня в массиве песен
  const [currenSongPlay, setCurrentSongPlay] = useState({
    author: songsList[0].author,
    originalAuthor: songsList[0].originalAuthor,
    songName: songsList[0].songName,
    src: songsList[0].src,
    type: songsList[0].type,
    clip: null,
    id: songsList[0].id,
    lyric: songsList[0].lyric,
    albumsCover: songsList[0].albumsCover,
  });

  const buttonPlayStopClasses = classNames(
    'player__play-btn',
    'player__play-btn_play',
    { 'player__play-btn_pause': isSongPlay }
  );

  const buttonShowPlaylist = classNames(
    'player__control-btn',
    'player__control-btn_open',
    {
      'player__control-btn_close': isSongListOpen,
    }
  );

  let audioElement = useRef();
  let audioArray = useRef([]);

  //при монтировании плеера создаем аудиоконтекст,
  //создаём источник из audioElement-а
  //создаем анализатор
  //подключаем источник - к выходу и к анализатору
  //записываем контекст в стейт, чтобы иметь возможность обращаться к нему
  //из обработчика клика "play"
  useEffect(() => {
    //console.log(audioElement.current);
    const ctx = new AudioContext();
    //const AudioContext = window.AudioContext || window.webkitAudioContext;
    //setAudioCtx(new AudioContext());
    const audioSrc = ctx.createMediaElementSource(audioElement.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    audioArray.current = new Uint8Array(analyser.frequencyBinCount);
    audioSrc.connect(analyser).connect(ctx.destination);

    //analyser.connect(ctx.destination);
    setAudioCtx(ctx);
    setAnalyser(analyser);
  }, []);

  // Работа плей/стоп
  useEffect(() => {
    isSongPlay ? audioElement.current.play() : audioElement.current.pause();
  }, [isSongPlay]);

  // Задаем время в стейте
  useInterval(
    () => {
      setCurrentSongTime(audioElement.current.currentTime);
    },
    isSongPlay ? 500 : null
  );

  //получение данных от аудио
  const getAudioData = () => {
    analyser.getByteFrequencyData(audioArray.current);
  };

  // Меняем строку состояния и время в плеере
  const onTimeUpdateSongTime = () => {
    const playPoint = durationTime - currentSongTime;
    let songDuration =
      Math.floor(playPoint / 60) +
      ':' +
      (Math.round(playPoint % 60) < 10 ? 0 : '') +
      Math.round(playPoint % 60);
    let seekerCoverLength =
      (currentSongTime * 100) / audioElement.current.duration;

    setSeekerCover(seekerCoverLength);
    setSongTime(songDuration);
    getAudioData();
  };

  // Меняем стейт по щелчку на плей
  const handlePlayCLick = () => setSongPlay(!isSongPlay);
  // Меняем блок релизов на песни
  const toggleLyricSongs = () => changeLyricSongs(!lyricSongsToggle);

  // Открываем лист с песнями
  const handleSongsList = () => setSongListOpen(!isSongListOpen);

  // Смена трека в источнике audio
  const handleNewTrack = () => {
    setSongPlay(false);
    audioElement.current.load();
  };

  //Переключаем точку проигрывания песни
  const handleSeekerClick = (evt) => {
    audioElement.current.currentTime =
      ((evt.pageX -
        evt.target.closest('.player__seeker').getBoundingClientRect().x) *
        audioElement.current.duration) /
      evt.target.closest('.player__seeker').getBoundingClientRect().width;
    onTimeUpdateSongTime();
  };

  // Функция выбора песни из списка
  const handleSetCurrentSong = (song) => {
    handleNewTrack();
    setSeekerCover('0');
    setCurrentSongPlay({
      author: song.author,
      originalAuthor: song.originalAuthor,
      songName: song.songName,
      src: song.src,
      type: song.type,
      id: song.id,
      clip: song.clip,
      lyric: song.lyric,
      albumsCover: song.albumsCover,
    });
  };

  return (
    <>
      {isSongPlay ? <Visualization arr={audioArray.current} /> : null}

      <section
        className="player"
        style={{
          gridTemplateAreas: `${
            isSongListOpen ? templateAreas.open : templateAreas.close
          }`,
        }}>
        <audio
          className="player__audio"
          ref={audioElement}
          onTimeUpdate={onTimeUpdateSongTime}
          onLoadedMetadata={() => {
            // Загружеам метаданные трека и кладем в стейт
            setDurationTime(audioElement.current.duration);
          }}>
          <source src={currenSongPlay.src} type={currenSongPlay.type}></source>
        </audio>
        {/* <div className="player__main-container"> */}
        {isSongListOpen ? (
          <img
            className="player__cover"
            src={currenSongPlay.albumsCover}
            alt="Обложка альбома"
          />
        ) : null}

        {/* кнопка плей/пауза */}
        <div className="player__container">
          {/* Контейнер с плеером */}
          <button
            onClick={() => {
              if (audioCtx.state === 'suspended') {
                audioCtx.resume();
              }
              handlePlayCLick();
            }}
            type="button"
            className={buttonPlayStopClasses}></button>
          <div
            className={
              isSongListOpen
                ? currenSongPlay.clip
                  ? 'player__seeker-info-box player__seeker-open'
                  : 'player__seeker-info-box player__seeker-right-indentation'
                : 'player__seeker-info-box'
            }>
            <div className="player__info-box">
              <p className="player__song-info">
                {currenSongPlay.author} feat. {currenSongPlay.originalAuthor} -{' '}
                {currenSongPlay.songName}
              </p>
              <span className="player__song-time">{songTime || ''}</span>
            </div>

            <div className="player__seeker" onClick={handleSeekerClick}>
              <div
                className="player__seeker-cover"
                style={{ width: `${styleSeekerCover}%` }}></div>
            </div>
          </div>
          <div className="player__functional-btn-box">
            {isSongListOpen && currenSongPlay.clip ? (
              <PlayerClipButton clipUrl={currenSongPlay.clip} />
            ) : null}

            {/* Условный рентеринг кнопки для смены текста/списка песен внутри бокса */}
            {isSongListOpen ? (
              <button className="player__switch-btn" onClick={toggleLyricSongs}>
                {lyricSongsToggle ? 'Релизы' : 'Текст песни'}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className={buttonShowPlaylist}
            onClick={handleSongsList}></button>
        </div>

        <PlayerMenu
          isBoxOpen={isSongListOpen}
          toggleTextSongs={lyricSongsToggle}
          songLyric={currenSongPlay.lyric}
          onClickSongSet={handleSetCurrentSong}
        />

        {/* Кнопка для выплывания списка песен/текстов */}
      </section>
    </>
  );
};
export default Player;
