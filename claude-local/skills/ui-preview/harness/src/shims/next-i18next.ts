// Stand-in for `next-i18next`: the same react-i18next API, backed by the
// i18next instance the harness initializes (locales served from public/).
import type { ComponentType } from "react";

export { useTranslation, Trans, withTranslation, I18nextProvider } from "react-i18next";
export { default as i18n } from "i18next";
export type { TFunction } from "i18next";
export type UserConfig = Record<string, unknown>;

export const appWithTranslation = <P>(App: ComponentType<P>) => App;
export const serverSideTranslations = async () => ({});
