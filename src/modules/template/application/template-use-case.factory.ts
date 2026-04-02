import { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseTemplateRepository } from "../infrastructure/repositories/supabase-template.repository";
import { CreateTemplateUseCase } from "./use-cases/create-template.use-case";
import { DeleteTemplateUseCase } from "./use-cases/delete-template.use-case";
import { GetTemplateUseCase } from "./use-cases/get-template.use-case";
import { ListTemplatesUseCase } from "./use-cases/list-templates.use-case";
import { UpdateTemplateUseCase } from "./use-cases/update-template.use-case";

export class TemplateUseCaseFactory {
  public static create(supabase: SupabaseClient) {
    return new TemplateUseCaseFactoryImpl(supabase);
  }
}

class TemplateUseCaseFactoryImpl {
  private repository: SupabaseTemplateRepository;

  constructor(supabase: SupabaseClient) {
    this.repository = new SupabaseTemplateRepository(supabase);
  }

  public listTemplates() {
    return new ListTemplatesUseCase(this.repository);
  }

  public getTemplate() {
    return new GetTemplateUseCase(this.repository);
  }

  public createTemplate() {
    return new CreateTemplateUseCase(this.repository);
  }

  public updateTemplate() {
    return new UpdateTemplateUseCase(this.repository);
  }

  public deleteTemplate() {
    return new DeleteTemplateUseCase(this.repository);
  }
}
