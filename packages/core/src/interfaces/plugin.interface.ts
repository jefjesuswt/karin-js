import { KarinApplication } from "../karin.application";

export interface OnModuleInit {
  onModuleInit(): Promise<void> | void;
}

export interface OnModuleDestroy {
  onModuleDestroy(): Promise<void> | void;
}

export interface KarinPlugin
  extends Partial<OnModuleInit>,
    Partial<OnModuleDestroy> {
  name: string;
  install(app: KarinApplication): Promise<void> | void;
}
