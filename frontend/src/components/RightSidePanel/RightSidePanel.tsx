import React from 'react';
import './RightSidePanel.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
};

const RightSidePanel: React.FC<Props> = ({ isOpen, onClose, title, children }) => {
  // inject isOpen into child(ren) safely (casts to any for cloning)
  const childWithProp = React.Children.map(children, child =>
    React.isValidElement(child)
      ? React.cloneElement(child as React.ReactElement<any>, { isOpen })
      : child
  );

  return (
    <>
      <div className={`rf-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`rf-right-panel ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen} role="dialog" aria-modal={isOpen}>
        <div className="rf-panel-header">
          {title ? <div className="rf-panel-title">{title}</div> : <div />}
          <button className="rf-close-btn" onClick={onClose} aria-label="Close panel">✕</button>
        </div>
        <div className="rf-panel-body">{childWithProp}</div>
      </aside>
    </>
  );
};

export default RightSidePanel;
