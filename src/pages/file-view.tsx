import { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Button, Space, Spin, App } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  CopyOutlined,
  CodeOutlined,
  FileOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Content } = Layout;
const { Title, Text } = Typography;

interface FileViewState {
  content: string;
  isLoading: boolean;
  fileName: string;
  lastUpdated: Date | null;
  wordCount: number;
  lineCount: number;
  url: string;
}

export default function FileView() {
  const { t } = useTranslation('fileView');
  const { message } = App.useApp();
  const [fileState, setFileState] = useState<FileViewState>({
    content: '',
    isLoading: true,
    fileName: 'filename',
    lastUpdated: null,
    wordCount: 0,
    lineCount: 0,
    url: ''
  });

  const contentRef = useRef<HTMLDivElement>(null);

  type ShowTypeOption = 'code' | 'preview';

  const [showType, setShowType] = useState<ShowTypeOption>('code')
  const [url, setUrl] = useState<string>('')

  // Calculate file statistics
  const calculateStats = (content: string) => {
    const lineCount = content.split('\n').length;
    const wordCount = content.replace(/\s+/g, ' ').trim().split(' ').filter(word => word.length > 0).length;
    return { wordCount, lineCount };
  };

  // Listen for file update events
  useEffect(() => {
    const handleFileUpdated = (status: ShowTypeOption, content: string) => {
      console.log('File content updated:', content.length, 'characters');

      setShowType(status)
      if (status === 'preview') {
        setFileState(pre => ({
          ...pre,
          url: content,
          isLoading: false,
          lastUpdated: new Date(),
        }))
        return;
      }

      const stats = calculateStats(content);
      
      setFileState(prev => ({
        ...prev,
        content,
        isLoading: false,
        lastUpdated: new Date(),
        wordCount: stats.wordCount,
        lineCount: stats.lineCount
      }));

      // Scroll to bottom to show latest content
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }, 100);
    };

    // Listen for file update events from main thread
    if ((window.api as any)?.onFileUpdated) {
      (window.api as any).onFileUpdated(handleFileUpdated);
    }

    // Set loading state on initialization
    setTimeout(() => {
      if (fileState.content === '') {
        setFileState(prev => ({ ...prev, isLoading: false }));
      }
    }, 3000);

    // Clean up listeners
    return () => {
      if (window.api?.removeAllListeners) {
        window.api.removeAllListeners('file-updated');
      }
    };
  }, []);

  // Copy content to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fileState.content);
      message.success(t('copy_success'));
    } catch (error) {
      console.error('Copy failed:', error);
      message.error(t('copy_failed'));
    }
  };

  // Download file
  const handleDownload = () => {
    const blob = new Blob([fileState.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileState.fileName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success(t('download_success'));
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Layout className="h-screen">
      <Content className="p-4 flex flex-col">
        {/* Header information bar */}
        <Card>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileTextOutlined className="text-xl text-blue-500" />
              <div>
                <Title level={4} className="m-0">
                  {t('title')}
                </Title>
                <Text type="secondary" className="text-xs">
                  {fileState.lastUpdated ? t('last_updated', { time: formatTime(fileState.lastUpdated) }) : t('waiting_content')}
                </Text>
              </div>
            </div>

            <Space>
              <Text type="secondary" className="text-xs">
                {t('stats', { lines: fileState.lineCount, words: fileState.wordCount })}
              </Text>
              <Button
                icon={<CodeOutlined />}
                size="small"
                onClick={() => setShowType('code')}
                type={showType === 'code' ? 'primary' : 'default'}
              >
                {t('code')}
              </Button>
              <Button
                icon={<FileOutlined />}
                size="small"
                onClick={() => setShowType('preview')}
                disabled={!fileState.url}
                type={showType === 'preview' ? 'primary' : 'default'}
              >
                {t('preview')}
              </Button>
              <Button
                icon={<CopyOutlined />}
                size="small"
                onClick={handleCopy}
                disabled={!fileState.content}
              >
                {t('copy')}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={handleDownload}
                disabled={!fileState.content}
              >
                {t('download')}
              </Button>
            </Space>
          </div>
        </Card>

        {/* File content area */}
        {showType === 'code' ? (<Card className='flex-1 overflow-auto' ref={contentRef}>
          {fileState.isLoading ? (
            <div className="flex justify-center items-center h-full flex-col gap-4">
              <Spin size="large" />
              <Text type="secondary">{t('waiting_ai')}</Text>
            </div>
          ) : fileState.content ? (
            <div className="h-full overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap break-words p-4 rounded-md">
              {fileState.content}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full flex-col gap-4">
              <FileTextOutlined className="text-6xl text-gray-300" />
              <div className="text-center">
                <Title level={4} type="secondary">{t('no_content')}</Title>
                <Text type="secondary">
                  {t('no_content_hint')}
                </Text>
              </div>
            </div>
          )}
        </Card>) : (<>
        <iframe src={fileState.url} className='h-full bg-white'></iframe>
        </>)}
        
      </Content>
    </Layout>
  );
}