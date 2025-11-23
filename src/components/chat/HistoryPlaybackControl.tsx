import React from 'react';
import { Button, Slider, Select, Space, Tooltip, Popover } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { PlaybackState, PlaybackSpeed } from '@/hooks/useHistoryPlayback';
import { useTranslation } from 'react-i18next';

interface HistoryPlaybackControlProps {
  playbackState: PlaybackState;
  currentIndex: number;
  totalMessages: number;
  speed: PlaybackSpeed;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onProgressChange: (index: number) => void;
}

/**
 * History playback control panel
 * Provides playback controls like play/pause, speed adjustment, and progress seeking
 */
export const HistoryPlaybackControl: React.FC<HistoryPlaybackControlProps> = ({
  playbackState,
  currentIndex,
  totalMessages,
  speed,
  progress,
  onPlay,
  onPause,
  onRestart,
  onStepForward,
  onStepBackward,
  onSpeedChange,
  onProgressChange,
}) => {
  const { t } = useTranslation('playback');

  const isPlaying = playbackState === 'playing';
  const isCompleted = playbackState === 'completed';
  const isIdle = playbackState === 'idle';

  // Speed options
  const speedOptions = [
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1 },
    { label: '2x', value: 2 },
    { label: '5x', value: 5 },
    { label: '10x', value: 10 },
  ];

  // Handle slider change
  const handleSliderChange = (value: number) => {
    // Convert progress (0-100) to message index
    const targetIndex = Math.round((value / 100) * (totalMessages - 1));
    onProgressChange(targetIndex);
  };

  // Get current message count display
  const messageCountDisplay = `${Math.max(0, currentIndex + 1)} / ${totalMessages}`;

  return (
    <div
      className="history-playback-control"
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        background: 'linear-gradient(180deg, rgba(30, 28, 35, 0.95) 0%, rgba(40, 28, 57, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(94, 49, 216, 0.2)',
        zIndex: 100,
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 whitespace-nowrap min-w-[60px]">
            {messageCountDisplay}
          </span>
          <Slider
            value={progress}
            onChange={handleSliderChange}
            tooltip={{
              formatter: (value) => `${value}%`,
            }}
            className="flex-1"
            styles={{
              track: {
                background: 'linear-gradient(90deg, #5E31D8 0%, #8B5CF6 100%)',
              },
              rail: {
                background: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          />
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {progress}%
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <Space size="small">
            {/* Step backward */}
            <Tooltip title={t('step_backward') || 'Previous message'}>
              <Button
                type="text"
                icon={<StepBackwardOutlined />}
                onClick={onStepBackward}
                disabled={currentIndex <= -1}
                className="!text-gray-300 hover:!text-white"
              />
            </Tooltip>

            {/* Play/Pause */}
            {isPlaying ? (
              <Tooltip title={t('pause') || 'Pause'}>
                <Button
                  type="primary"
                  icon={<PauseOutlined />}
                  onClick={onPause}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #5E31D8 0%, #8B5CF6 100%)',
                    borderColor: 'transparent',
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip title={isCompleted ? (t('replay') || 'Replay') : (t('play') || 'Play')}>
                <Button
                  type="primary"
                  icon={<CaretRightOutlined />}
                  onClick={onPlay}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #5E31D8 0%, #8B5CF6 100%)',
                    borderColor: 'transparent',
                  }}
                />
              </Tooltip>
            )}

            {/* Step forward */}
            <Tooltip title={t('step_forward') || 'Next message'}>
              <Button
                type="text"
                icon={<StepForwardOutlined />}
                onClick={onStepForward}
                disabled={currentIndex >= totalMessages - 1}
                className="!text-gray-300 hover:!text-white"
              />
            </Tooltip>

            {/* Restart */}
            <Tooltip title={t('restart') || 'Restart'}>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={onRestart}
                disabled={isIdle}
                className="!text-gray-300 hover:!text-white"
              />
            </Tooltip>
          </Space>

          {/* Speed control */}
          <Space size="small">
            <Popover
              content={
                <div className="p-2">
                  <div className="text-xs text-gray-400 mb-2">
                    {t('playback_speed') || 'Playback Speed'}
                  </div>
                  <Select
                    value={speed}
                    onChange={onSpeedChange}
                    options={speedOptions}
                    style={{ width: 100 }}
                    dropdownStyle={{
                      background: 'rgba(30, 28, 35, 0.98)',
                      backdropFilter: 'blur(20px)',
                    }}
                  />
                </div>
              }
              trigger="click"
              placement="topRight"
              overlayInnerStyle={{
                background: 'rgba(30, 28, 35, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(94, 49, 216, 0.3)',
              }}
            >
              <Button
                type="text"
                icon={<SettingOutlined />}
                className="!text-gray-300 hover:!text-white"
              >
                <span className="text-xs">{speed}x</span>
              </Button>
            </Popover>
          </Space>
        </div>

        {/* Status indicator */}
        <div className="text-center">
          <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {isPlaying && (t('playing') || '▶ Playing...')}
            {playbackState === 'paused' && (t('paused') || '⏸ Paused')}
            {isCompleted && (t('completed') || '✓ Completed')}
            {isIdle && (t('ready') || '⏹ Ready')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HistoryPlaybackControl;
