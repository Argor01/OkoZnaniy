import React, { useEffect, useRef } from 'react';
import EditorToolbar from './EditorToolbar';
import styles from './RichTextEditor.module.css';

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
  const editableRef = useRef<HTMLDivElement>(null);

  const handleFormat = (format: string) => {
    if (!editableRef.current) return;
    editableRef.current.focus();
    if (format === 'bold') document.execCommand('bold');
    if (format === 'italic') document.execCommand('italic');
    if (format === 'underline') document.execCommand('underline');
    if (format === 'strikethrough') document.execCommand('strikeThrough');
  };

  const handleInsert = (type: 'link' | 'image') => {
    if (!editableRef.current) return;
    editableRef.current.focus();
    if (type === 'link') {
      const url = window.prompt('Введите ссылку');
      if (url) document.execCommand('createLink', false, url);
    }
    if (type === 'image') {
      const url = window.prompt('Введите URL изображения');
      if (url) document.execCommand('insertImage', false, url);
    }
  };

  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  return (
    <div className={styles.editor}>
      <EditorToolbar onFormat={handleFormat} onInsert={handleInsert} />
      <div
        ref={editableRef}
        className={styles.textarea}
        contentEditable
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
