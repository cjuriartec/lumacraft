import type { GuidancePreferences } from "@/modules/guidance/domain/guidance.types";
import { mergeGuidancePreferences } from "@/modules/guidance/domain/guidance-preferences";
import { BaseEntity } from "@/shared/domain/base-entity";
import { ok, Result } from "@/shared/domain/result";

export interface UserPreferences {
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
  guidance?: GuidancePreferences;
}

export function mergeUserPreferences(
  current: UserPreferences,
  incoming: Partial<UserPreferences>,
): UserPreferences {
  return {
    ...current,
    ...incoming,
    guidance: mergeGuidancePreferences(current.guidance, incoming.guidance),
  };
}

export interface UserProfileProps {
  id: string; // auth.users.id
  preferences: UserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserProfile extends BaseEntity {
  private props: UserProfileProps;

  constructor(props: UserProfileProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get preferences(): UserPreferences {
    return this.props.preferences;
  }

  public updatePreferences(newPreferences: Partial<UserPreferences>): void {
    this.props.preferences = mergeUserPreferences(this.props.preferences, newPreferences);
  }

  public static create(props: {
    id: string;
    preferences?: Partial<UserPreferences>;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<UserProfile> {
    const defaultPreferences: UserPreferences = {
      sidebarCollapsed: true,
      theme: "system",
    };

    return ok(
      new UserProfile({
        id: props.id,
        preferences: mergeUserPreferences(defaultPreferences, props.preferences ?? {}),
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      }),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
