-- RLS Policies for Accounts
CREATE POLICY "Users can view accounts they are members of"
ON public.accounts
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.account_members
        WHERE account_members.account_id = accounts.id
        AND account_members.user_id = auth.uid()
    )
    OR owner_id = auth.uid()
);

-- RLS Policies for Roles
CREATE POLICY "Users can view roles of their accounts"
ON public.roles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.account_members
        WHERE account_members.account_id = roles.account_id
        AND account_members.user_id = auth.uid()
    )
);

-- RLS Policies for Account Members
CREATE POLICY "Users can view members of their accounts"
ON public.account_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.account_members as m
        WHERE m.account_id = account_members.account_id
        AND m.user_id = auth.uid()
    )
);

-- RLS Policies for Collections
CREATE POLICY "Users can view collections of their accounts"
ON public.collections
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.account_members
        WHERE account_members.account_id = collections.account_id
        AND account_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create collections in their accounts"
ON public.collections
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.account_members
        WHERE account_members.account_id = collections.account_id
        AND account_members.user_id = auth.uid()
        -- In a real scenario, we would also check the role's permissions
    )
);

CREATE POLICY "Users can update collections in their accounts"
ON public.collections
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.account_members
        WHERE account_members.account_id = collections.account_id
        AND account_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete collections in their accounts"
ON public.collections
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.account_members
        WHERE account_members.account_id = collections.account_id
        AND account_members.user_id = auth.uid()
    )
);
