/**
 * Google API Platform Library类型声明
 */
declare global {
  interface Window {
    gapi?: {
      load: (apis: string, callback: () => void) => void;
      auth2: {
        getAuthInstance: () => any;
        init: (config: {
          client_id: string;
          scope: string;
        }) => Promise<any>;
      };
    };
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            error_callback?: (error: any) => void;
          }) => void;
          prompt: (callback?: (notification: {
            isDisplayed: () => boolean;
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            isDismissedMoment: () => boolean;
          }) => void) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: number;
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              logo_alignment?: 'left' | 'center';
              locale?: string;
            }
          ) => void;
          cancel: () => void;
          onGoogleLibraryLoad?: () => void;
        };
      };
    };
  }
}

export {};
