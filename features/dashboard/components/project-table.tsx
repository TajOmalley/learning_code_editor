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
    description:string | null;
}

export default function ProjectTable({projects, onDeleteProject, onDuplicateProject, onUpdateProject}:ProjectTableProps){
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [editData, setEditData] = useState<EditProjectData>({ title: "", description: null })
    const [isLoading, setIsLoading] = useState(false)
    const [favorite, setFavorite] = useState(false)


    const handleDuplicateProject = async (project: Project) => {
        if(!onDuplicateProject) return;

        setIsLoading(true);
        try {
            await onDuplicateProject(project.id);
            toast.success("Project Duplicated Successfully")
        } catch (error){
            toast.error("Failed to Duplicate Project")
            console.error(error)
        } finally {
            setIsLoading(false)
        }

    };

    const handleEditClick = async (project: Project) => {
        setSelectedProject(project);
        setEditData({
            title:project.title,
            description:project.description || ""
        })
        setEditDialogOpen(true)
    };

    const handleUpdateProject = async ()=> {
        if(!selectedProject || !onUpdateProject) return;

        setIsLoading(true);
        try {
            await onUpdateProject(selectedProject.id, editData)
            setEditDialogOpen(false);
            setSelectedProject(null);
            toast.success("Project Updated Successfully")
        } catch (error) {
            toast.error("Failed to Update Project")
            console.error("Error Updating Project:", error)
        }
        finally{
            setIsLoading(false)
        }
    }

    const copyProjectUrl = async (projectId: string) => {
        const url = `${window.location.origin}/playground/${projectId}`
        navigator.clipboard.writeText(url);
        toast.success("Project URL Copied to Clipboard")
    };

    const handleDeleteClick = async(project: Project) => {
        setSelectedProject(project);
        setDeleteDialogOpen(true)
    };

    const handleDeleteProject = async()=>{
        if (!selectedProject || !onDeleteProject) return;
        setIsLoading(true);

        try {
            await onDeleteProject(selectedProject.id);
            setDeleteDialogOpen(false);
            setSelectedProject(null);
            toast.success("Project Deleted Sucessfully");
        } catch (error) {
            toast.error("Failed to Delete Project")
            console.error(error)
        }
        finally{
            setIsLoading(false);
        }
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
                                <span className="text-sm text-gray-500 line-clamp-1">{project.description}</span>
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8" suppressHydrationWarning>
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
                                        <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                            <Edit3 className="h-4 w-4 mr-2"/>
                                            Edit Project
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicateProject(project)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Duplicate
                                        </DropdownMenuItem>
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
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Make Changes to Your Project Details Here. Click Save When Finished.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Project Title</Label>
                        <Input
                            id="title"
                            value={editData.title}
                            onChange={(e) => setEditData((prev) => ({...prev, title: e.target.value}))}
                            placeholder="Enter Project Title"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={editData.description}
                            onChange={(e) => setEditData((prev) => ({...prev, descriptionescription: e.target.value}))}
                            placeholder="Enter Project Description"
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant={"outline"} onClick={()=>setEditDialogOpen(false)} disabled={isLoading}>Cancel</Button>
                    <Button type="button" variant={"brand"} onClick={handleUpdateProject}>
                        {
                            isLoading ? "Saving..." : "Save Changes"
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <span className="font-semibold text-gray-400"> "{selectedProject?.title}" </span>? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProject} disabled={isLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isLoading ? "Deleting..." : "Delete Project"}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}