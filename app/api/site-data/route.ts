import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { defaultData } from "@/lib/default-data"

const dataFilePath = path.join(process.cwd(), "data.json")

export async function GET() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const fileContent = fs.readFileSync(dataFilePath, "utf-8")
            const data = JSON.parse(fileContent)
            return NextResponse.json(data)
        }
        return NextResponse.json(defaultData)
    } catch (error) {
        console.error("Error reading data file:", error)
        return NextResponse.json(defaultData)
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json()
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error saving data file:", error)
        return NextResponse.json({ success: false, error: "Failed to save data" }, { status: 500 })
    }
}
