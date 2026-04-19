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
  fullName?: string;
  avatarUrl?: string;
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

  get fullName(): string | undefined {
    return this.props.fullName;
  }

  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }

  public updateProfile(props: { fullName?: string; avatarUrl?: string }): void {
    if (props.fullName !== undefined) this.props.fullName = props.fullName;
    if (props.avatarUrl !== undefined) this.props.avatarUrl = props.avatarUrl;
  }

  public updatePreferences(newPreferences: Partial<UserPreferences>): void {
    this.props.preferences = mergeUserPreferences(this.props.preferences, newPreferences);
  }

  public static create(props: {
    id: string;
    fullName?: string;
    avatarUrl?: string;
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
        fullName: props.fullName,
        avatarUrl: props.avatarUrl,
        preferences: mergeUserPreferences(defaultPreferences, props.preferences ?? {}),
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      }),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      fullName: this.fullName,
      avatarUrl: this.avatarUrl,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
