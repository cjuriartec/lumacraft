import { BaseEntity } from "@/shared/domain/base-entity";
import { fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";

import { Email } from "../value-objects/email.vo";

export interface UserProps {
  id: string;
  email: Email;
  fullName?: DisplayName;
  avatarUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends BaseEntity {
  private props: UserProps;

  constructor(props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get email(): Email {
    return this.props.email;
  }

  get fullName(): string | undefined {
    return this.props.fullName?.value;
  }

  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }

  public static create(props: {
    id: string;
    email: Email | string;
    fullName?: string;
    avatarUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<User> {
    const emailResult =
      typeof props.email === "string" ? Email.create(props.email) : ok(props.email);
    if (!emailResult.ok) return fail(emailResult.error);

    const fullNameResult = props.fullName
      ? DisplayName.create(props.fullName, "Full Name")
      : ok(undefined);
    if (!fullNameResult.ok) return fail(fullNameResult.error);

    return ok(
      new User({
        ...props,
        email: emailResult.value,
        fullName: fullNameResult.value as DisplayName | undefined,
      }),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      email: this.email.value,
      fullName: this.fullName,
      avatarUrl: this.avatarUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
