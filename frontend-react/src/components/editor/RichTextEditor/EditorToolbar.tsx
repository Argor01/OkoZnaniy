import React from 'react';
import { Button, Space } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  LinkOutlined,
  PictureOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import styles from './RichTextEditor.module.css';

interface EditorToolbarProps {
  onFormat: (format: string) => void;
  onInsert: (type: 'link' | 'image') => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onFormat, onInsert }) => {
  return (
    <div className={styles.toolbar}>
      <Space size="small" wrap>
        <Button
          type="text"
          size="small"
          icon={<BoldOutlined />}
          onClick={() => onFormat('bold')}
          className={styles.toolbarButton}
        />
        <Button
          type="text"
          size="small"
          icon={<ItalicOutlined />}
          onClick={() => onFormat('italic')}
          className={styles.toolbarButton}
        />
        <Button
          type="text"
          size="small"
          icon={<UnderlineOutlined />}
          onClick={() => onFormat('underline')}
          className={styles.toolbarButton}
        />
        <Button
          type="text"
          size="small"
          icon={<StrikethroughOutlined />}
          onClick={() => onFormat('strikethrough')}
          className={styles.toolbarButton}
        />
        <div className={styles.divider} />
        <Button
          type="text"
          size="small"
          icon={<AlignLeftOutlined />}
          onClick={() => onFormat('alignLeft')}
          className={styles.toolbarButton}
        />
        <Button
          type="text"
          size="small"
          icon={<AlignCenterOutlined />}
          onClick={() => onFormat('alignCenter')}
          className={styles.toolbarButton}
        />
        <Button
          type="text"
          size="small"
          icon={<AlignRightOutlined />}
          onClick={() => onFormat('alignRight')}
          className={styles.toolbarButton}
        />
        <div className={styles.divider} />
        <Button
          type="text"
          size="small"
          icon={<LinkOutlined />}
          onClick={() => onInsert('link')}
          className={styles.toolbarButton}
        />
        <Button
          type="text"
          size="small"
          icon={<PictureOutlined />}
          onClick={() => onInsert('image')}
          className={styles.toolbarButton}
        />
        <div className={styles.divider} />
        <Button
          type="text"
          size="small"
          icon={<UndoOutlined />}
          onClick={() => onFormat('undo')}
          className={styles.toolbarButton}
        />
        <Button
          type="text"
          size="small"
          icon={<RedoOutlined />}
          onClick={() => onFormat('redo')}
          className={styles.toolbarButton}
        />
      </Space>
    </div>
  );
};

export default EditorToolbar;
