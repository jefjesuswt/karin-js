import { KarinApplication } from "../karin.application";

export interface OnPluginInit {
  onPluginInit(): Promise<void> | void;
}

export interface OnPluginDestroy {
  onPluginDestroy(): Promise<void> | void;
}

export interface KarinPlugin
  extends Partial<OnPluginInit>,
    Partial<OnPluginDestroy> {
  name: string;
  install(app: KarinApplication): Promise<void> | void;
}
