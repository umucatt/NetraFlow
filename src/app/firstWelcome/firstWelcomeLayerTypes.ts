import type { ExampleTemplateId } from '../../exampleData';
import type { OverlayBackdropProps } from '../overlay';

export type FirstWelcomeStage = 'welcome' | 'story' | null;

export type FirstWelcomeStoryRoute = {
  templateId: ExampleTemplateId;
  title: string;
  description: string;
};

export type FirstWelcomeBackdropProps = OverlayBackdropProps;

export type FirstWelcomeLayerProps = {
  stage: FirstWelcomeStage;
  storyRoutes: FirstWelcomeStoryRoute[];
  onComplete: () => void;
  onOpenStory: () => void;
  onChooseStoryRoute: (templateId: ExampleTemplateId) => void;
};
