"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState } from "react";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Project } from "../types";
import { MarkedToggleButton } from "./toggle-star";
import { zTouch } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ProjectTableProps{
    projects:Project[];
    onUpdateProject?:Function;
    onDeleteProject?:Function;
    onDuplicateProject?:Function;
}

interface EditProjectData {
    title:string;
    description:string;
}

export default function ProjectTable({projects, onDeleteProject, onDuplicateProject, onUpdateProject}:ProjectTableProps){
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [editData, setEditData] = useState<EditProjectData>({ title: "", description: "" })
    const [isLoading, setIsLoading] = useState(false)
    const [favorite, setFavorite] = useState(false)
    const handleDuplicateProject = async (project: Project) => {
        if(!onDuplicateProject) return;

        setIsLoading(true);
        try {
        } catch (error){
        } finally {
        }

    };

    const handleEditClick = async (project: Project) => {

    };

    const copyProjectUrl = async (projectId: string) => {

    };

    const handleDeleteClick = async(project: Project) => {

    };


    return (
        <>
        <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {
                    projects.map((project)=>(
                        <TableRow key={project.id}>
                            <TableCell>
                            <div className="flex flex-col">
                                <Link href={`/playground/${project.id}`} className="hover:underline">
                                    <span className="font-semibold">{project.title}</span>
                                </Link>
                            </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-[#9D9999] text-[#ffffff] border-[#212121]">
                                    {project.template}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {format(new Date(project.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <Image
                                            src={project.user.image || "/placeholder.svg"}
                                            alt={project.user.name}
                                            width={32}
                                            height={32}
                                            className="object-cover"
                                        />
                                    </div>
                                    <span className="text-sm">{project.user.name}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-8" />
                                            <span className="sr-only">Open Menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem asChild>
                                            {/*<MarkedToggleButton markedForRevision={project.Starmark[0]?.ismarked} id={project.id} />*/}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/playground/${project.id}`} className="flex items-center">
                                                <Eye className="h-4 w-4 mr-2" />
                                                Open Project
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/playground/${project.id}`} target="_blank" className="flex items-center">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Open in New Tab
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => copyProjectUrl(project.id)}>
                                            <Download className="h-4 w-4 mr-2"/>
                                            Copy URL
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuItem onClick={() => handleDeleteClick(project)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Project
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                }
            </TableBody>
        </Table>
        </div>
        </>
    );
}