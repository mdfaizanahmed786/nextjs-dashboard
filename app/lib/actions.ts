"use server";
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoice(prevState:State, formData: FormData) {
  try {
    const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
    const { customerId, amount, status } = validatedFields.data;
    console.log(validatedFields, "This is the console of validatedFields...")
    console.log(customerId, amount, status);
    //   It's usually good practice to store monetary values in cents in your database to eliminate JavaScript floating-point errors and ensure greater accuracy.
    const amountInCents = amount * 100;
    const rawFormData2 = Object.fromEntries(formData.entries());
    const date = new Date().toISOString().split("T")[0];
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (err) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

const UpdateInvoice = InvoiceSchema.omit({ date: true });

export async function updateInvoice(id: string, prevState:State, formData: FormData) {
  
  try {
    const validatedFields = UpdateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
      };
    }
   
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;

  } catch (err:unknown) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
  // should be at the end of the function, why? 
  // because it's a side effect, it's not part of the logic of the function
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  // throw new Error("Not Implemented");
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}