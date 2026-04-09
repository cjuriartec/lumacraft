import { SupabaseClient } from "@supabase/supabase-js";

import { LocalStorageGridStateRepository } from "../infrastructure/repositories/local-storage-grid-state.repository";
import { SupabaseCollectionRepository } from "../infrastructure/repositories/supabase-collection.repository";
import { SupabaseEagerLoadRepository } from "../infrastructure/repositories/supabase-eager-load.repository";
import { SupabaseFieldRepository } from "../infrastructure/repositories/supabase-field.repository";
import { SupabaseRecordRepository } from "../infrastructure/repositories/supabase-record.repository";
import { SupabaseRelationRepository } from "../infrastructure/repositories/supabase-relation.repository";
import { SupabaseStorageRepository } from "../infrastructure/repositories/supabase-storage.repository";
import { CreateCollectionUseCase } from "./use-cases/create-collection.use-case";
import { CreateFieldUseCase } from "./use-cases/create-field.use-case";
import { CreateRecordUseCase } from "./use-cases/create-record.use-case";
import { DeleteCollectionUseCase } from "./use-cases/delete-collection.use-case";
import { DeleteFieldUseCase } from "./use-cases/delete-field.use-case";
import { DeleteRecordUseCase } from "./use-cases/delete-record.use-case";
import { DownloadFileUseCase } from "./use-cases/download-file.use-case";
import { EagerLoadRecordUseCase } from "./use-cases/eager-load-record.use-case";
import { DeleteFileUseCase, UploadFileUseCase } from "./use-cases/file-mgmt.use-case";
import { GetCollectionUseCase } from "./use-cases/get-collection.use-case";
import { ListCollectionsUseCase } from "./use-cases/list-collections.use-case";
import { ListFieldsUseCase } from "./use-cases/list-fields.use-case";
import { ListRecordsUseCase } from "./use-cases/list-records.use-case";
import { PersistGridFiltersUseCase } from "./use-cases/persist-grid-filters.use-case";
import { ReorderFieldsUseCase } from "./use-cases/reorder-fields.use-case";
import { ResolveReverseLookupUseCase } from "./use-cases/resolve-reverse-lookup.use-case";
import { UpdateCollectionUseCase } from "./use-cases/update-collection.use-case";
import { UpdateFieldUseCase } from "./use-cases/update-field.use-case";
import { UpdateRecordUseCase } from "./use-cases/update-record.use-case";

export class CollectionUseCaseFactory {
  public static create(supabase: SupabaseClient) {
    return new CollectionUseCaseFactoryImpl(supabase);
  }
}

class CollectionUseCaseFactoryImpl {
  private repositories: {
    collection: SupabaseCollectionRepository;
    field: SupabaseFieldRepository;
    record: SupabaseRecordRepository;
    relation: SupabaseRelationRepository;
    storage: SupabaseStorageRepository;
    eagerLoad: SupabaseEagerLoadRepository;
    gridState: LocalStorageGridStateRepository;
  };

  constructor(supabase: SupabaseClient) {
    this.repositories = {
      collection: new SupabaseCollectionRepository(supabase),
      field: new SupabaseFieldRepository(supabase),
      record: new SupabaseRecordRepository(supabase),
      relation: new SupabaseRelationRepository(supabase),
      storage: new SupabaseStorageRepository(supabase),
      eagerLoad: new SupabaseEagerLoadRepository(supabase),
      gridState: new LocalStorageGridStateRepository(),
    };
  }

  // --- Collection ---
  public listCollections() {
    return new ListCollectionsUseCase(this.repositories.collection);
  }

  public getCollection() {
    return new GetCollectionUseCase(this.repositories.collection);
  }

  public createCollection() {
    return new CreateCollectionUseCase(this.repositories.collection);
  }

  public updateCollection() {
    return new UpdateCollectionUseCase(this.repositories.collection);
  }

  public deleteCollection() {
    return new DeleteCollectionUseCase(this.repositories.collection);
  }

  // --- Fields ---
  public listFields() {
    return new ListFieldsUseCase(this.repositories.field);
  }

  public createField() {
    return new CreateFieldUseCase(this.repositories.field);
  }

  public updateField() {
    return new UpdateFieldUseCase(this.repositories.field);
  }

  public deleteField() {
    return new DeleteFieldUseCase(this.repositories.field, this.repositories.record);
  }

  public reorderFields() {
    return new ReorderFieldsUseCase(this.repositories.field);
  }

  // --- Records ---
  public listRecords() {
    return new ListRecordsUseCase(this.repositories.record);
  }

  public createRecord() {
    return new CreateRecordUseCase(
      this.repositories.record,
      this.repositories.field,
      this.repositories.relation,
    );
  }

  public updateRecord() {
    return new UpdateRecordUseCase(
      this.repositories.record,
      this.repositories.field,
      this.repositories.relation,
    );
  }

  public deleteRecord() {
    return new DeleteRecordUseCase(this.repositories.record);
  }

  public eagerLoadRecord() {
    return new EagerLoadRecordUseCase(this.repositories.eagerLoad);
  }

  // --- Others ---
  public uploadFile() {
    return new UploadFileUseCase(this.repositories.storage);
  }

  public downloadFile() {
    return new DownloadFileUseCase(this.repositories.storage);
  }

  public deleteFile() {
    return new DeleteFileUseCase(this.repositories.storage);
  }

  public persistGridFilters() {
    return new PersistGridFiltersUseCase(this.repositories.gridState);
  }

  public resolveReverseLookup() {
    return new ResolveReverseLookupUseCase(this.repositories.field, this.repositories.record);
  }
}
