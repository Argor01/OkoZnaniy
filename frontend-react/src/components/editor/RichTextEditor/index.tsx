import React from 'react';
import { Input } from 'antd';
import EditorToolbar from './EditorToolbar';
import styles from './RichTextEditor.module.css';

const { TextArea } = Input;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  rows = 8,
}) => {
  const handleFormat = (format: string) => {
    // Простая реализация форматирования
    // В реальном проекте можно использовать document.execCommand или библиотеку
    console.log('Format:', format);
  };

  const handleInsert = (type: 'link' | 'image') => {
    // Вставка ссылки или изображения
    console.log('Insert:', type);
  };

  return (
    <div className={styles.editor}>
      <EditorToolbar onFormat={handleFormat} onInsert={handleInsert} />
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={styles.textarea}
      />
    </div>
  );
};

export default RichTextEditor;
