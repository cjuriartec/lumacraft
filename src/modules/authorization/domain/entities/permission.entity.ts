import { BaseEntity } from "@/shared/domain/base-entity";

import { PermissionActionType } from "../value-objects/permission-action.vo";

interface CollectionPermissionProps {
  id: string;
  roleId: string;
  collectionId: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export class CollectionPermission extends BaseEntity {
  private props: CollectionPermissionProps;

  constructor(props: CollectionPermissionProps) {
    super(props.id);
    this.props = props;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get collectionId(): string {
    return this.props.collectionId;
  }

  get canRead(): boolean {
    return this.props.canRead;
  }

  get canCreate(): boolean {
    return this.props.canCreate;
  }

  get canUpdate(): boolean {
    return this.props.canUpdate;
  }

  get canDelete(): boolean {
    return this.props.canDelete;
  }

  hasPermission(action: PermissionActionType): boolean {
    switch (action) {
      case "READ":
        return this.canRead;
      case "CREATE":
        return this.canCreate;
      case "UPDATE":
        return this.canUpdate;
      case "DELETE":
        return this.canDelete;
      case "MANAGE":
        return this.canRead && this.canCreate && this.canUpdate && this.canDelete;
      default:
        return false;
    }
  }

  public toJSON() {
    return {
      id: this.id,
      roleId: this.roleId,
      collectionId: this.collectionId,
      canRead: this.canRead,
      canCreate: this.canCreate,
      canUpdate: this.canUpdate,
      canDelete: this.canDelete,
    };
  }
}
