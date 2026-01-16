import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRecoilValue } from 'recoil';

import { isNonEmptyString } from '@sniptt/guards';
import { useTheme } from '@emotion/react';

import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

type WatermarkOptions = {
  width: number;
  height: number;
  rotate: number;
  font: string;
  fillStyle: string;
  opacity: number;
};

const createWatermarkDataUrl = (
  text: string,
  options: WatermarkOptions,
): string => {
  if (!isNonEmptyString(text) || typeof window === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = options.opacity;
  ctx.fillStyle = options.fillStyle;
  ctx.font = options.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((options.rotate * Math.PI) / 180);
  ctx.fillText(text, 0, 0);

  return canvas.toDataURL('image/png');
};

export const WatermarkOverlay = () => {
  const theme = useTheme();
  const currentUser = useRecoilValue(currentUserState);
  const currentWorkspaceMember = useRecoilValue(currentWorkspaceMemberState);
  const tokenPair = useRecoilValue(tokenPairState);
  const [hiddenText, setHiddenText] = useState('');
  const accessToken = tokenPair?.accessOrWorkspaceAgnosticToken?.token;

  useEffect(() => {
    if (!currentUser?.id || !currentUser?.email) {
      setHiddenText('');
      return;
    }

    if (!isNonEmptyString(accessToken)) {
      setHiddenText('');
      return;
    }

    const controller = new AbortController();

    fetch(`${REACT_APP_SERVER_BASE_URL}/watermark`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('Failed to load')),
      )
      .then((data) => {
        const nextHiddenText =
          typeof data?.hiddenText === 'string' ? data.hiddenText : '';
        setHiddenText(nextHiddenText);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHiddenText('');
        }
      });

    return () => controller.abort();
  }, [currentUser?.id, currentUser?.email, accessToken]);

  const workspaceMemberName = [
    currentWorkspaceMember?.name?.firstName,
    currentWorkspaceMember?.name?.lastName,
  ]
    .filter(isNonEmptyString)
    .join(' ')
    .trim();

  const fallbackName = [currentUser?.firstName, currentUser?.lastName]
    .filter(isNonEmptyString)
    .join(' ')
    .trim();

  const displayName = isNonEmptyString(workspaceMemberName)
    ? workspaceMemberName
    : fallbackName;
  const displayEmail = currentWorkspaceMember?.userEmail ?? currentUser?.email;

  const visibleText = [displayName, displayEmail]
    .filter(isNonEmptyString)
    .join(' | ');

  const visibleDataUrl = useMemo(
    () =>
      createWatermarkDataUrl(visibleText, {
        width: 360,
        height: 260,
        rotate: -20,
        font: `${theme.font.weight.medium} 16px ${theme.font.family}`,
        fillStyle: theme.font.color.primary,
        opacity: 0.08,
      }),
    [
      visibleText,
      theme.font.weight.medium,
      theme.font.family,
      theme.font.color.primary,
    ],
  );

  const hiddenDataUrl = useMemo(
    () =>
      createWatermarkDataUrl(hiddenText, {
        width: 260,
        height: 200,
        rotate: -20,
        font: `${theme.font.weight.regular} 12px ${theme.font.family}`,
        fillStyle: theme.font.color.primary,
        opacity: 0.02,
      }),
    [
      hiddenText,
      theme.font.weight.regular,
      theme.font.family,
      theme.font.color.primary,
    ],
  );

  if (!isNonEmptyString(visibleDataUrl) && !isNonEmptyString(hiddenDataUrl)) {
    return null;
  }

  const baseStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    backgroundRepeat: 'repeat',
    zIndex: 9999,
  };

  return (
    <>
      {isNonEmptyString(visibleDataUrl) && (
        <div
          aria-hidden="true"
          style={{
            ...baseStyle,
            backgroundImage: `url(${visibleDataUrl})`,
            backgroundSize: '360px 260px',
          }}
        />
      )}
      {isNonEmptyString(hiddenDataUrl) && (
        <div
          aria-hidden="true"
          style={{
            ...baseStyle,
            backgroundImage: `url(${hiddenDataUrl})`,
            backgroundSize: '260px 200px',
          }}
        />
      )}
    </>
  );
};
