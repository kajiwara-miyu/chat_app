// types/react-mentions.d.ts

declare module 'react-mentions' {
    import * as React from 'react';
  
    export interface MentionData {
      id: string;
      display: string;
    }
  
    export interface MentionsInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
      value: string;
      onChange: (event: { target: { value: string } }) => void;
      style?: any;
    }
  
    export interface MentionProps {
      trigger: string | RegExp;
      data: MentionData[] | ((query: string, callback: (suggestions: MentionData[]) => void) => void);
      displayTransform?: (id: string, display: string) => string;
      appendSpaceOnAdd?: boolean;
    }
  
    export const MentionsInput: React.FC<MentionsInputProps>;
    export const Mention: React.FC<MentionProps>;
  }
  