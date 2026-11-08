/**
 * OTTO HOLOGRAM - Master Renderer & Component
 * Dispatches holographic content according to type (image | text | card | chart | search-result | gallery)
 */

import React from 'react';
import { OttoHologramContent } from './hologramTypes';
import { ImageHologram } from './ImageHologram';
import { TextHologram } from './TextHologram';
import { CardHologram } from './CardHologram';
import { ChartHologram } from './ChartHologram';
import { SearchResultHologram } from './SearchResultHologram';
import { GalleryHologram } from './GalleryHologram';
import { DraggableWindow } from '../DraggableWindow';

export interface OttoHologramProps {
  content: OttoHologramContent;
  originFromMascot?: boolean;
  draggable?: boolean;
  onClose?: () => void;
  className?: string;
}

export const OttoHologram: React.FC<OttoHologramProps> = ({
  content,
  originFromMascot = false,
  draggable = false,
  onClose,
  className = '',
}) => {
  const renderBody = () => {
    switch (content.type) {
      case 'image':
        if (!content.imageUrl) return null;
        return (
          <ImageHologram
            imageUrl={content.imageUrl}
            title={content.title}
            aspectRatio={content.aspectRatio || '16/9'}
            originFromMascot={originFromMascot}
          />
        );

      case 'gallery':
        if (!content.images || content.images.length === 0) {
          if (content.imageUrl) {
            return (
              <ImageHologram
                imageUrl={content.imageUrl}
                title={content.title}
                aspectRatio={content.aspectRatio || '16/9'}
                originFromMascot={originFromMascot}
              />
            );
          }
          return null;
        }
        return (
          <GalleryHologram
            images={content.images}
            originFromMascot={originFromMascot}
          />
        );

      case 'text':
        return (
          <TextHologram
            text={content.text || content.title || ''}
            subtitle={content.metadata?.subtitle}
            category={content.metadata?.category}
            originFromMascot={originFromMascot}
          />
        );

      case 'card':
        return (
          <CardHologram
            title={content.title || ''}
            subtitle={content.metadata?.subtitle}
            description={content.text}
            badge={content.metadata?.badge}
            actionText={content.metadata?.actionText}
            actionUrl={content.metadata?.actionUrl}
            originFromMascot={originFromMascot}
          />
        );

      case 'chart':
        return (
          <ChartHologram
            title={content.title || 'Métricas Holográficas'}
            data={content.data || [
              { label: 'CPU', value: 42 },
              { label: 'RAM', value: 68 },
              { label: 'REDE', value: 85 },
              { label: 'IA', value: 92 },
            ]}
            unit={content.metadata?.unit}
            originFromMascot={originFromMascot}
          />
        );

      case 'search-result':
        return (
          <SearchResultHologram
            title={content.title || ''}
            url={content.metadata?.url || '#'}
            domain={content.metadata?.domain || 'web'}
            snippet={content.text}
            originFromMascot={originFromMascot}
          />
        );

      default:
        if (content.imageUrl) {
          return (
            <ImageHologram
              imageUrl={content.imageUrl}
              title={content.title}
              originFromMascot={originFromMascot}
            />
          );
        }
        if (content.text) {
          return (
            <TextHologram
              text={content.text}
              originFromMascot={originFromMascot}
            />
          );
        }
        return null;
    }
  };

  if (draggable) {
    return (
      <DraggableWindow
        title={content.title || 'Projeção Holográfica OTTO'}
        onClose={onClose}
        initialWidth={480}
        maxWidth={720}
        className={className}
      >
        {renderBody()}
      </DraggableWindow>
    );
  }

  return <div className={`w-full ${className}`}>{renderBody()}</div>;
};

export const OttoHologramRenderer = OttoHologram;
export default OttoHologram;
