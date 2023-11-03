"use server";
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  try {
    const { customerId, amount, status } = CreateInvoice.parse({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      status: formData.get("status"),
    });
    console.log(customerId, amount, status);
    //   It's usually good practice to store monetary values in cents in your database to eliminate JavaScript floating-point errors and ensure greater accuracy.
    const amountInCents = amount * 100;
    const rawFormData2 = Object.fromEntries(formData.entries());
    const date = new Date().toISOString().split("T")[0];
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
  } catch (err) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
}

const UpdateInvoice = InvoiceSchema.omit({ date: true });

export async function updateInvoice(id: string, formData: FormData) {
  
  try {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      status: formData.get("status"),
    });
  
    console.log(customerId, amount, status)
    const amountInCents = amount * 100;

    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
  } catch (err:unknown) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
}

export async function deleteInvoice(id: string) {
  throw new Error("Not Implemented");
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}