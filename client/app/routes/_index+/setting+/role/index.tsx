import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { roleService } from "~/action.server/role.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { RoleManagement } from "~/components/role";
import { parseCookieFromRequest } from "~/sessions";
import { toast } from "~/components/notification";

export const meta: MetaFunction = () => {
  return [
    { title: "Quản lý vai trò - Cài đặt" },
    { name: "description", content: "Quản lý các vai trò và phân quyền trong hệ thống" },
  ];
};

/**
 * GET /setting/role
 * Load all roles
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { cookie } = await parseCookieFromRequest(request);
    const roles = await roleService.getRoles({ cookie });

    return {
      success: true,
      data: { roles },
    }
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message || "Không thể tải danh sách vai trò",
      },
      { status: 400 }
    );
  }
}

/**
 * POST /setting/role
 * Handle role CRUD operations
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { cookie } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    switch (actionType) {
      case "create": {
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const permissions = JSON.parse((formData.get("permissions") as string) || "[]");

        const result = await roleService.createRole({
          cookie,
          name,
          description,
          permissions,
        });

        // Reload roles after create
        const roles = await roleService.getRoles({ cookie });

        return json({
          success: true,
          message: "Đã tạo vai trò thành công",
          data: { roles },
        });
      }

      case "update": {
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const permissions = JSON.parse((formData.get("permissions") as string) || "[]");

        const result = await roleService.updateRole({
          cookie,
          id: Number(id),
          name,
          description,
          permissions,
        });

        // Reload roles after update
        const roles = await roleService.getRoles({ cookie });

        return json({
          success: true,
          message: "Đã cập nhật vai trò",
          data: { roles },
        });
      }

      case "delete": {
        const id = formData.get("id") as string;

        await roleService.deleteRole({
          cookie,
          id: Number(id),
        });

        // Reload roles after delete
        const roles = await roleService.getRoles({ cookie });

        return json({
          success: true,
          message: "Đã xóa vai trò",
          data: { roles },
        });
      }

      case "load": {
        const roles = await roleService.getRoles({ cookie });

        return json({
          success: true,
          data: { roles },
        });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    return json(
      {
        error: error.message || "Thao tác thất bại",
        success: false,
      },
      { status: 400 }
    );
  }
}

export default function RoleManagementRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Quản lý vai trò" className="p-4">
        <RoleManagement initialData={data.data?.roles || []} />
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
